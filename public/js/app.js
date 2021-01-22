/*global Router */
'use strict';

var ENTER_KEY = 13;
var ESCAPE_KEY = 27;

var util = {
  uuid: function () {
    /*jshint bitwise:false */
    var i, random;
    var uuid = '';

    for (i = 0; i < 32; i++) {
      random = Math.random() * 16 | 0;
      if (i === 8 || i === 12 || i === 16 || i === 20) {
        uuid += '-';
      }
      uuid += (i === 12 ? 4 : (i === 16 ? (random & 3 | 8) : random)).toString(16);
    }

    return uuid;
  },
  pluralize: function (count, word) {
    return count === 1 ? word : word + 's';
  },
  store: function (namespace, data) {
    if (arguments.length > 1) {
      return localStorage.setItem(namespace, JSON.stringify(data));
    } else {
      var store = localStorage.getItem(namespace);
      return (store && JSON.parse(store)) || [];
    }
  }
};

var App = {
  init: function () {
    this.todos = util.store('todos-jquery');
    // [x] Remove Handlebars in todoTemplate.
    this.todoTemplate = function (todos) {
      return todos.map(function (todo) {
        return `
          <li class="${todo.completed ? "completed" : ""}" data-id="${todo.id}">
            <div class="view">
              <input class="toggle" type="checkbox" ${todo.completed ? "checked" : ""}>
              <label>${todo.title}</label>
              <button class="destroy"></button>
            </div>
            <input class="edit" value="${todo.title}">
          </li>
        `;
      }).join('');
    };
    // [x] Remove handleBars in footerTemplate.
    this.footerTemplate = function (props) {
      return `
          <span id="todo-count"><strong>${props.activeTodoCount}</strong>${props.activeTodoWord} left</span>
          <ul id="filters">
            <li>
              <a class="${props.filter === 'all' ? "selected" : ""}" href="#/all">All</a>
            </li>
            <li>
              <a class="${props.filter === 'active' ? "selected" : ""}" href="#/active">Active</a>
            </li>
            <li>
              <a class="${props.filter === 'competed' ? "selected" : ""}" href="#/completed">Completed</a>
            </li>
          </ul>
          ${props.completedTodos ? '<button id="clear-completed">Clear completed</button>' : ''}
        `;
    };
    this.bindEvents();

    new Router({
      '/:filter': function (filter) {
        this.filter = filter;
        this.render();
      }.bind(this)
    }).init('/all');
  },
  bindEvents: function () {
    var newTodoInput = document.querySelector('#new-todo');
    var toggleAllCheckbox = document.querySelector('#toggle-all');
    var footer = document.querySelector('#footer');
    var todoListUl = document.querySelector('#todo-list');
    var clearCompletedBtn = document.querySelector('#clear-completed');

    newTodoInput.addEventListener('keyup', this.create.bind(this));
    toggleAllCheckbox.addEventListener('change', this.toggleAll.bind(this));
    footer.addEventListener('click', function (e) {
      if (e.target.id === 'clear-completed') {
        this.destroyCompleted(e);
      }
    }.bind(this));
    todoListUl.addEventListener('dblclick', function (e) {
      if (e.target.tagName === 'LABEL') {
        this.edit(e);
      }
    }.bind(this));
    todoListUl.addEventListener('keyup', function (e) {
      if (e.target.className === 'edit') {
        this.editKeyup(e);
      }
    }.bind(this));
    todoListUl.addEventListener('focusout', function (e) {
      if (e.target.className === 'edit') {
        this.update(e);
      }
    }.bind(this));
    todoListUl.addEventListener('click', function (e) {
      if (e.target.className === 'destroy') {
        this.destroy(e);
      }
    }.bind(this));
    todoListUl.addEventListener('change', function (e) {
      if (e.target.className === 'toggle') {
        this.toggle(e);
      }
    }.bind(this));
  },
  render: function () {
    var todos = this.getFilteredTodos();
    var todoListUl = document.querySelector('#todo-list');
    var main = document.querySelector('#main');
    var toggleAllCheckbox = document.querySelector('#toggle-all');
    var newTodoInput = document.querySelector('#new-todo');

    todoListUl.innerHTML = this.todoTemplate(todos);
    main.style.display = todos.length > 0 ? 'block' : 'none';
    toggleAllCheckbox.checked = this.getActiveTodos().length === 0;
    this.renderFooter();
    newTodoInput.focus();
    util.store('todos-jquery', this.todos);
  },
  renderFooter: function () {
    var todoCount = this.todos.length;
    var activeTodoCount = this.getActiveTodos().length;
    var template = this.footerTemplate({
      activeTodoCount: activeTodoCount,
      activeTodoWord: util.pluralize(activeTodoCount, 'item'),
      completedTodos: todoCount - activeTodoCount,
      filter: this.filter
    });
    var footer = document.querySelector('#footer');

    footer.style.display = todoCount > 0 ? 'block' : 'none';
    footer.innerHTML = template;
  },
  toggleAll: function (e) {
    var isChecked = e.target.checked;

    this.todos.forEach(function (todo) {
      todo.completed = isChecked;
    });

    this.render();
  },
  getActiveTodos: function () {
    return this.todos.filter(function (todo) {
      return !todo.completed;
    });
  },
  getCompletedTodos: function () {
    return this.todos.filter(function (todo) {
      return todo.completed;
    });
  },
  getFilteredTodos: function () {
    if (this.filter === 'active') {
      return this.getActiveTodos();
    }

    if (this.filter === 'completed') {
      return this.getCompletedTodos();
    }

    return this.todos;
  },
  destroyCompleted: function (e) {
    this.todos = this.getActiveTodos();
    this.filter = 'all';
    this.render();
  },
  // accepts an element from inside the `.item` div and
  // returns the corresponding index in the `todos` array
  indexFromEl: function (el) {
    var id = el.closest('li').dataset.id;
    var todos = this.todos;
    var i = todos.length;

    while (i--) {
      if (todos[i].id === id) {
        return i;
      }
    }
  },
  create: function (e) {
    var inputElement = e.target;
    var val = inputElement.value.trim();

    if (e.which !== ENTER_KEY || !val) {
      return;
    }

    this.todos.push({
      id: util.uuid(),
      title: val,
      completed: false
    });

    inputElement.value = '';

    this.render();
  },
  toggle: function (e) {
    var i = this.indexFromEl(e.target);
    this.todos[i].completed = !this.todos[i].completed;
    this.render();
  },
  edit: function (e) {
    var targetElement = e.target;
    var closestLiElement = targetElement.closest('li');
    var inputElement = closestLiElement.querySelector('.edit');

    closestLiElement.className = 'editing';
    inputElement.focus();
  },
  editKeyup: function (e) {
    if (e.which === ENTER_KEY) {
      e.target.blur();
    }

    if (e.which === ESCAPE_KEY) {
      e.target.setAttribute('abort', true);
      e.target.blur();
    }
  },
  update: function (e) {
    var el = e.target;
    var val = el.value.trim();

    if (!val) {
      this.destroy(e);
      return;
    }

    if (el.getAttribute('abort')) {
      el.setAttribute('abort', false);
    } else {
      this.todos[this.indexFromEl(el)].title = val;
    }

    this.render();
  },
  destroy: function (e) {
    this.todos.splice(this.indexFromEl(e.target), 1);
    this.render();
  }
};

App.init();