var templates = {};

var tags = {
  all: function() {
    return storage.get('tags', true);
  },
  update: function() {
    var tags = contacts.all().map(function(contact) {
      return contact.tags;
    });
    var flattenTags = [].concat.apply([], tags);
    var uniqueTags = [];

    $.each(flattenTags, function(_, tag){
      if ($.inArray(tag, uniqueTags) === -1) uniqueTags.push(tag);
    });

    storage.set('tags', uniqueTags);
  },
};

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
    localStorage['tags'] = localStorage['tags'] || '[]';
  }
};

var contacts = {
  retrieveIds: function() {
    return storage.get('contactIds', true);
  },
  all: function() {
    var contactIDs = this.retrieveIds();

    return contactIDs.map(function(id) {
      return storage.get('contact-' + id, true);
    });
  },
  get: function($e) {
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
    var contact = this.get($e);
    var isTags;

    if (contact.isNew) {
      contact.isNew = false;
      storage.set('currentID', contact.id + 1);
    }

    formInfo.forEach(function(field) {
      isTags = field.name === 'tags';
      contact[field.name] = isTags ? field.value.split(/,\s*/) : field.value;
    });

    this.save(contact);
    tags.update();
  },
  save: function(contact) {
    var allIds = this.retrieveIds();
    allIds.includes(contact.id) ? null : allIds.push(contact.id);

    storage.set('contactIds', allIds);
    storage.set('contact-' + contact.id, contact);
  },
  show: function(filtered) {
    var allContacts = filtered ? filtered : this.all();

    $('.contacts').html($(templates.contacts({ contacts: allContacts })));
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
  $main: $('main'),
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
  homePage: function(e) {
    if (e) e.preventDefault();
    var self = this;

    this.$main.slideUp();

    setTimeout(function() {
      self.resetHome();
      self.$main.slideDown();
    }, 400);
  },
  resetHome: function(e) {
    this.$main.html($(templates.homepage({ contacts: contacts.all(),
                                          tags: tags.all(),
                                          currentID: storage.get('currentID') })));
  },
  contactForm: function(e) {
    e.preventDefault();
    var $e = $(e.target);
    var contact = contacts.get($e);
    var self = this;

    this.$main.slideUp();

    setTimeout(function() {
      self.$main.html($(templates.contact_form(contact)));
      self.$main.slideDown();
    }, 400);
  },
  updateContacts: function(e) {
    e.preventDefault();
    var $e = $(e.target);

    contacts.update($e);
    this.homePage();
  },
  deleteContact: function(e) {
    e.preventDefault();
    var remaining;

    if(confirm('Are you sure you want to delete this contact?')) {
      remaining = contacts.delete($(e.target));
    } else {
      return;
    }

    tags.update();
    this.resetHome();
  },
  noMatches: function(tag, query) {
    var message = '<p>No contacts';
    if (tag) { message += ' with tag of <strong>' + tag + '</strong>' }
    if (tag && query) { message += ' and' }
    if (query) { message += ' that start with <strong>' + query + '</strong>' }
    message += '.</p>';

    $('.contacts').html($(message));
  },
  select: function(callback) {
    return contacts.all().filter(callback);
  },
  filterMatches: function(tag, regex, query) {
    var filteredContacts = this.select(function(contact) {
      var isTag = tag ? contact.tags.includes(tag) : true;
      return isTag && regex.test(contact.name);
    });

    if (filteredContacts.length > 0) {
      contacts.show(filteredContacts);
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
    this.$main.on('click', '.add, .edit', this.contactForm.bind(this));
    this.$main.on('click', '.cancel', this.homePage.bind(this));
    this.$main.on('click', '.reset', this.resetHome.bind(this));
    this.$main.on('submit', '#contactForm', this.updateContacts.bind(this));
    this.$main.on('click', '.delete', this.deleteContact.bind(this));
    this.$main.on('change', ':radio', this.filterContacts.bind(this));
    this.$main.on('keyup', '.search', this.queryContacts.bind(this));
  },
  init: function() {
    this.cacheTemplates();
    this.registerPartials();
    storage.init();
    this.homePage();
    this.binds();
  },
};

$(manager.init.bind(manager));
