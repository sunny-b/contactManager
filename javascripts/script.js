var templates = {};

var storage = {
  get: function(key, parse) {
    return parse ? JSON.parse(localStorage.getItem(key)) : localStorage.getItem(key);
  },
  set: function(key, val) {
    localStorage.setItem(key, JSON.stringify(val));
  },
  remove: function(key) {
    localStorage.removeItem(key);
  },
  init: function() {
    localStorage['contactIds'] = localStorage['contactIds'] || '[]';
    localStorage['currentID'] = localStorage['currentID'] || '1';
  }
};

var contacts = {
  retrieveIds: function() {
    return storage.get('contactIds', true);
  },
  getAll: function() {
    var contactIDs = this.retrieveIds();

    return contactIDs.map(function(id) {
      return storage.get('contact-' + id, true);
    });
  },
  retrieve: function($e) {
    var id = $e.closest('[data-id]').data('id');
    var contact = storage.get('contact-' + id);

    if (contact) {
      contact = JSON.parse(contact);
    } else {
      contact = this.new();
    }

    return contact;
  },
  delete: function($e) {
    var id = $e.closest('[data-id]').data('id');
    var contactIds = storage.get('contactIds', true);
    var index = contactIds.indexOf(id);

    contactIds.splice(index, 1);
    storage.set('contactIds', contactIds);
    storage.remove('contact-' + id);
  },
  update: function($e) {
    var formInfo = $e.serializeArray();
    var contact = this.retrieveContact($e);
    var isTags;

    if (contact.isNew) {
      contact.isNew = false;
      storage.set('currentID', contact.id + 1);
    }

    formInfo.forEach(function(obj) {
      isTags = obj.name === 'tags';
      contact[obj.name] = isTags ? obj.value.split(/,\s*/) : obj.value;
    });

    this.updateStorage(contact);
  },
  updateStorage: function(contact) {
    var allIds = this.retrieveIds();
    allIds.includes(contact.id) ? null : allIds.push(contact.id);

    storage.set('contactIds', allIds);
    storage.set('contact-' + contact.id, contact);
  },
  show: function(filteredContactIds, id, el) {
    if (filteredContactIds.includes(id)) { el.show(); }
  },
  hide: function(filteredContactIds, id, el) {
    if (filteredContactIds.includes(id)) { el.hide(); }
  },
  new: function() {
    return {
      id: storage.get('currentID', true),
      isNew: true,
      name: '',
      email: '',
      phone: '',
      tags: ''
    };
  },
};

var manager = {
  cacheTemplates: function() {
    $('[type*=handlebars]').each(function() {
      templates[$(this).attr('id')] = Handlebars.compile($(this).html());
    });
  },
  registerPartials: function() {
    $('[data-type=partial]').each(function() {
      Handlebars.registerPartial($(this).attr('id'), $(this).html());
    });
  },
  extractTags: function(contacts) {
    var tags = contacts.map(function(contact) {
      return contact.tags;
    });
    var flattenTags = [].concat.apply([], tags);
    var uniqueTags = [];

    $.each(flattenTags, function(_, tag){
      if ($.inArray(tag, uniqueTags) === -1) uniqueTags.push(tag);
    });

    return uniqueTags;
  },
  showContacts: function(e) {
    if (e) { e.preventDefault() }
    var allContacts = contacts.getAll();
    var allTags = this.extractTags(allContacts);

    $('main').html($(templates.contacts({ contacts: allContacts,
                                          tags: allTags,
                                          currentID: storage.get('currentID') })));
  },
  contactForm: function(e) {
    e.preventDefault();
    var $e = $(e.target);

    var contact = contacts.get($e);
    $('main').html($(templates.contact_form(contact)));
  },
  updateContacts: function(e) {
    e.preventDefault();
    var $e = $(e.target);

    contacts.update($e);
    this.showContacts();
  },
  deleteContact: function(e) {
    e.preventDefault();
    if(confirm('Are you sure you want to delete this contact?')) {
      contacts.delete($(e.target));
    } else {
      return;
    }

    this.showContacts();
  },
  noMatches: function(tag, query) {
    var message = '<p>No contacts';
    if (tag) { message += ' with tag of <strong>' + tag + '</strong>' }
    if (tag && query) { message += ' or' }
    if (query) { message += ' that start with <strong>' + query + '</strong>' }
    message += '.</p>';

    $('.contacts').html($(message));
  },
  select: function(callback) {
    return contacts.getAll().filter(callback);
  },
  filterMatches: function(tag, regex, query) {
    var filteredContacts = this.select(function(contact) {
      return contact.tags.includes(tag) || regex.test(contact.name);
    });
    debugger;
    if (filteredIds.length > 0) {
      $('.contact').each(function() {
        var $contact = $(this);
        var contactId = $contact.data('id');

        filteredIds.includes(contactId) ? $contact.show() : $contact.hide();
      });
    } else {
      this.noMatches(tag, query);
    }
  },
  queryContacts: function(e) {
    var query = $(e.target).val();
    var searchRegex = new RegExp(query, 'i');
    var tag = $(':radio').filter(function() {
      return $(this).prop('checked');
    }).map(function() {
      return $(this).val();
    })[0];

    this.filterMatches(tag, searchRegex, query);
  },
  filterContacts: function(e) {
    var $el = $(e.target);
    var tag = $el.val();
    var query = $('.search').val();
    var searchRegex = new RegExp(query, 'i');

    this.filterMatches(tag, searchRegex, query);
  },
  binds: function() {
    $('main').on('click', '.add, .edit', this.contactForm.bind(this));
    $('main').on('click', '.cancel', this.showContacts.bind(this));
    $('main').on('submit', '#contactForm', this.updateContacts.bind(this));
    $('main').on('click', '.delete', this.deleteContact.bind(this));
    $('main').on('change', ':radio', this.filterContacts.bind(this));
    $('main').on('keyup', '.search', this.queryContacts.bind(this));
  },
  init: function() {
    this.cacheTemplates();
    this.registerPartials();
    storage.init();
    this.showContacts();
    this.binds();
  },
};

$(manager.init.bind(manager));
