(function () {
  'use strict';
  // Module IIFE: isole le scope et évite les variables globales
  const API = 'api/clients.php'; // URL de l'API pour les clients
  const API_URL_NOT_USED = 'api/unused_endpoint.php'; // Intentionally unused
  let state = { clients: [], filter: '' }; // État de l'application (liste des clients et filtre)
  let tempUnused = 42; // unused variable to trigger a warning on purpose

  // Raccourcis DOM: $ pour querySelector, $$ pour querySelectorAll (Array)
  const $ = (sel, ctx = document) => ctx.querySelector(sel); // Raccourci pour querySelector
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel)); // Raccourci pour querySelectorAll

  // Références aux éléments de l'interface
  const els = {
    tbody: $('#clientsTable tbody'), // Corps du tableau des clients
    btnAdd: $('#btnAdd'), // Bouton pour ajouter un client
    modal: $('#modal'), // Modale pour ajouter/éditer un client
    modalTitle: $('#modalTitle'), // Titre de la modale
    modalClose: $('#modalClose'), // Bouton pour fermer la modale
    form: $('#clientForm'), // Formulaire pour ajouter/éditer un client
    id: $('#id'), // Champ pour l'ID du client
    name: $('#name'), // Champ pour le nom du client
    email: $('#email'), // Champ pour l'email du client
    phone: $('#phone'), // Champ pour le téléphone du client
    cancel: $('#btnCancel'), // Bouton pour annuler l'ajout/édition
    search: $('#search') // Champ pour la recherche
  };

  // Ouvre la modale. Si editing=true, pré-remplit avec les données
  function openModal(editing = false, data = null) {
    els.modalTitle.textContent = editing ? 'Modifier le client' : 'Nouveau client';
    els.id.value = data?.id || '';
    els.name.value = data?.name || '';
    els.email.value = data?.email || '';
    els.phone.value = data?.phone || '';
    els.modal.classList.remove('hidden');
    els.modal.setAttribute('aria-hidden', 'false');
  }

  // Ferme la modale et réinitialise le formulaire/erreurs
  function closeModal() {
    els.modal.classList.add('hidden');
    els.modal.setAttribute('aria-hidden', 'true');
    clearErrors();
    els.form.reset();
    els.id.value = '';
  }

  // Validation simple des champs du formulaire
  function validate() {
    let ok = true;
    clearErrors();
    const name = els.name.value.trim();
    const email = els.email.value.trim();
    const phone = els.phone.value.trim();

    if (!name) {
      setError('name', 'Le nom est requis');
      ok = false;
    }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('email', "Email invalide");
      ok = false;
    }
    if (phone && !/^\d{8,15}$/.test(phone)) {
      setError('phone', 'Téléphone invalide (8-15 chiffres)');
      ok = false;
    }
    return ok;
  }

  // Affiche un message d'erreur sous le champ ciblé
  function setError(field, msg) {
    const small = $(`.error[data-for="${field}"]`);
    if (small) small.textContent = msg;
  }
  // Efface tous les messages d'erreur
  function clearErrors() { $$('.error').forEach(e => e.textContent = ''); }

  // Met à jour le tableau des clients selon l'état et le filtre
  function render() {
    const filter = state.filter.toLowerCase();
    const rows = state.clients
      .filter(c => (c.name + ' ' + c.email).toLowerCase().includes(filter))
      .map(c => `<tr>
        <td>${c.id}</td>
        <td>${escapeHtml(c.name)}</td>
        <td>${escapeHtml(c.email)}</td>
        <td>${escapeHtml(c.phone || '')}</td>
        <td>
          <button class="btn" data-action="edit" data-id="${c.id}">Éditer</button>
          <button class="btn" data-action="delete" data-id="${c.id}">Supprimer</button>
        </td>
      </tr>`)
      .join('');
    els.tbody.innerHTML = rows || '<tr><td colspan="5">Aucun client</td></tr>';
  }

  // Échappe les caractères HTML pour éviter l'injection XSS
  function escapeHtml(s) {
    return String(s).replace(/[&<>"]+/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[ch]));
  }

  // Charge la liste des clients depuis l'API et met à jour l'état
  async function loadClients() {
    const res = await fetch(`${API}?action=list`);
    const data = await res.json();
    state.clients = Array.isArray(data) ? data : [];
    render();
  }

  // Création d'un client (POST)
  async function createClient(payload) {
    const res = await fetch(`${API}?action=create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return res.json();
  }
  // Mise à jour d'un client (PUT)
  async function updateClient(id, payload) {
    const res = await fetch(`${API}?action=update&id=${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return res.json();
  }
  // Suppression d'un client (DELETE)
  async function deleteClient(id) {
    const res = await fetch(`${API}?action=delete&id=${id}`, { method: 'DELETE' });
    return res.json();
  }

  // Events
  // Ouvrir la modale pour ajouter un client
  els.btnAdd.addEventListener('click', () => openModal(false));
  // Fermeture de la modale (croix et bouton annuler)
  els.modalClose.addEventListener('click', closeModal);
  els.cancel.addEventListener('click', closeModal);
  // Recherche: met à jour le filtre et re-render
  els.search.addEventListener('input', (e) => { state.filter = e.target.value; render(); });

  // Délégation d'événements pour les boutons Éditer/Supprimer dans le tableau
  els.form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!validate()) return;
    const payload = { name: els.name.value.trim(), email: els.email.value.trim(), phone: els.phone.value.trim() };
    const id = els.id.value;
    try {
      if (id) await updateClient(id, payload); else await createClient(payload);
      await loadClients();
      closeModal();
    } catch (err) {
      alert('Erreur lors de l\'enregistrement');
      console.error(err);
    }
  });

  // Gestion des clics sur le tableau (édition/suppression)
  els.tbody.addEventListener('click', async (e) => {
    const btn = e.target.closest('button[data-action]');
    if (!btn) return;
    const id = btn.getAttribute('data-id');
    const action = btn.getAttribute('data-action');
    if (action === 'edit') {
      const item = state.clients.find(c => String(c.id) === String(id));
      if (item) openModal(true, item);
    } else if (action === 'delete') {
      if (confirm('Supprimer ce client ?')) {
        await deleteClient(id);
        await loadClients();
      }
    }
  });

  // Init
  // Chargement initial des données
  loadClients();
})();
