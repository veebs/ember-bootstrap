import { not } from '@ember/object/computed';
import { assert } from '@ember/debug';
import Component from '@ember/component';
import { computed, observer } from '@ember/object';
import { bind, next, schedule } from '@ember/runloop';
import layout from 'ember-bootstrap/templates/components/bs-modal';
import listenTo from 'ember-bootstrap/utils/cp/listen-to';
import transitionEnd from 'ember-bootstrap/utils/transition-end';
import { getDestinationElement } from '../../utils/dom';
import { guidFor } from '@ember/object/internals';
import usesTransition from 'ember-bootstrap/utils/cp/uses-transition';
import isFastBoot from 'ember-bootstrap/utils/is-fastboot';

/**
  Component for creating [Bootstrap modals](http://getbootstrap.com/javascript/#modals) with custom markup.

  ### Usage

  ```hbs
  <BsModal @onSubmit={{action "submit"}} as |Modal|>
    <Modal.header>
      <h4 class="modal-title"><i class="glyphicon glyphicon-alert"></i> Alert</h4>
    </Modal.header>
    <Modal.body>
      Are you absolutely sure you want to do that???
    </Modal.body>
    <Modal.footer as |footer|>
      <BsButton @onClick={{action Modal.close}} @type="danger">Oh no, forget it!</BsButton>
      <BsButton @onClick={{action Modal.submit}} @type="success">Yeah!</BsButton>
    </Modal.footer>
  </BsModal>
  ```

  The component yields references to the following contextual components, that you can use to further customize the output:

  * [modal.body](Components.ModalBody.html)
  * [modal.header](Components.ModalHeader.html)
  * [modal.footer](Components.ModalFooter.html)

  Furthermore references to the following actions are yielded:

  * `close`: triggers the `onHide` action and closes the modal
  * `submit`: triggers the `onSubmit` action (or the submit event on a form if present in the body element)

  ### Further reading

  See the documentation of the [bs-modal-simple](Components.ModalSimple.html) component for further examples.

  @class Modal
  @namespace Components
  @extends Ember.Component
  @public
*/
let component = Component.extend({
  layout,
  tagName: '',

  /**
   * Visibility of the modal. Toggle to show/hide with CSS transitions.
   *
   * When the modal is closed by user interaction this property will not update by using two-way bindings in order
   * to follow DDAU best practices. If you want to react to such changes, subscribe to the `onHide` action
   *
   * @property open
   * @type boolean
   * @default true
   * @public
   */
  open: true,

  /**
   * @property isOpen
   * @private
   */
  isOpen: listenTo('open'),

  /**
   * @property _isOpen
   * @private
   */
  _isOpen: false,

  /**
   * Set to false to disable fade animations.
   *
   * @property fade
   * @type boolean
   * @default true
   * @public
   */
  fade: undefined,

  /**
   * @property notFade
   * @type boolean
   * @private
   */
  notFade: not('fade'),

  /**
   * Used to apply Bootstrap's visibility classes.
   *
   * @property showModal
   * @type boolean
   * @default false
   * @private
   */
  showModal: false,

  /**
   * Render modal markup?
   *
   * @property inDom
   * @type boolean
   * @default false
   * @private
   */
  inDom: false,

  /**
   * @property paddingLeft
   * @type number|null
   * @default null
   * @private
   */
  paddingLeft: null,

  /**
   * @property paddingRight
   * @type number|null
   * @default null
   * @private
   */
  paddingRight: null,

  /**
   * Use a semi-transparent modal background to hide the rest of the page.
   *
   * @property backdrop
   * @type boolean
   * @default true
   * @public
   */
  backdrop: true,

  /**
   * @property showBackdrop
   * @type boolean
   * @default false
   * @private
   */
  showBackdrop: false,

  /**
   * Closes the modal when escape key is pressed.
   *
   * @property keyboard
   * @type boolean
   * @default true
   * @public
   */
  keyboard: true,

  /**
   * [BS4 only!] Vertical position, either 'top' (default) or 'center'
   * 'center' will apply the `modal-dialog-centered` class
   *
   * @property position
   * @type {string}
   * @default 'top'
   * @public
   */
  position: 'top',

  /**
   * @property dialogComponent
   * @type {String}
   * @private
   */
  dialogComponent: 'bs-modal/dialog',

  /**
   * @property headerComponent
   * @type {String}
   * @private
   */
  headerComponent: 'bs-modal/header',

  /**
   * @property bodyComponent
   * @type {String}
   * @private
   */
  bodyComponent: 'bs-modal/body',

  /**
   * @property footerComponent
   * @type {String}
   * @private
   */
  footerComponent: 'bs-modal/footer',

  /**
   * The id of the `.modal` element.
   *
   * @property modalId
   * @type string
   * @readonly
   * @private
   */
  modalId: computed(function() {
    return `${guidFor(this)}-modal`;
  }),

  /**
   * The id of the backdrop element.
   *
   * @property backdropId
   * @type string
   * @readonly
   * @private
   */
  backdropId: computed(function() {
    return `${guidFor(this)}-backdrop`;
  }),

  /**
   * Property for size styling, set to null (default), 'lg' or 'sm'
   *
   * Also see the [Bootstrap docs](http://getbootstrap.com/javascript/#modals-sizes)
   *
   * @property size
   * @type String
   * @public
   */
  size: null,

  /**
   * If true clicking on the backdrop will close the modal.
   *
   * @property backdropClose
   * @type boolean
   * @default true
   * @public
   */
  backdropClose: true,

  /**
   * If true component will render in place, rather than be wormholed.
   *
   * @property renderInPlace
   * @type boolean
   * @default false
   * @public
   */
  renderInPlace: false,

  /**
   * @property _renderInPlace
   * @type boolean
   * @private
   */
  _renderInPlace: computed('renderInPlace', 'destinationElement', function() {
    return this.get('renderInPlace') || !this.destinationElement;
  }),

  /**
   * The duration of the fade transition
   *
   * @property transitionDuration
   * @type number
   * @default 300
   * @public
   */
  transitionDuration: 300,

  /**
   * The duration of the backdrop fade transition
   *
   * @property backdropTransitionDuration
   * @type number
   * @default 150
   * @public
   */
  backdropTransitionDuration: 150,

  /**
   * Use CSS transitions?
   *
   * @property usesTransition
   * @type boolean
   * @readonly
   * @private
   */
  usesTransition: usesTransition('fade'),

  /**
   * The action to be sent when the modal footer's submit button (if present) is pressed.
   * Note that if your modal body contains a form (e.g. [Components.Form](Components.Form.html)) this action will
   * not be triggered. Instead a submit event will be triggered on the form itself. See the class description for an
   * example.
   *
   * @property onSubmit
   * @type function
   * @public
   */
  onSubmit() {
  },

  /**
   * The action to be sent when the modal is closing.
   * This will be triggered by pressing the modal header's close button (x button) or the modal footer's close button.
   * Note that this will happen before the modal is hidden from the DOM, as the fade transitions will still need some
   * time to finish. Use the `onHidden` if you need the modal to be hidden when the action triggers.
   *
   * You can return false to prevent closing the modal automatically, and do that in your action by
   * setting `open` to false.
   *
   * @property onHide
   * @type function
   * @public
   */
  onHide() {
  },

  /**
   * The action to be sent after the modal has been completely hidden (including the CSS transition).
   *
   * @property onHidden
   * @type function
   * @default null
   * @public
   */
  onHidden() {
  },

  /**
   * The action to be sent when the modal is opening.
   * This will be triggered immediately after the modal is shown (so it's safe to access the DOM for
   * size calculations and the like). This means that if fade=true, it will be shown in between the
   * backdrop animation and the fade animation.
   *
   * @property onShow
   * @type function
   * @default null
   * @public
   */
  onShow() {
  },

  /**
   * The action to be sent after the modal has been completely shown (including the CSS transition).
   *
   * @property onShown
   * @type function
   * @public
   */
  onShown() {
  },

  actions: {
    close() {
      if (this.get('onHide')() !== false) {
        this.set('isOpen', false);
      }
    },
    submit() {
      // replace modalId by :scope selector if supported by all target browsers
      let modalId = this.get('modalId');
      let forms = this.get('modalElement').querySelectorAll(`#${modalId} .modal-body form`);
      if (forms.length > 0) {
        // trigger submit event on body forms
        let event = document.createEvent('Events');
        event.initEvent('submit', true, true);
        Array.prototype.slice.call(forms).forEach((form) => form.dispatchEvent(event));
      } else {
        // if we have no form, we send a submit action
        this.get('onSubmit')();
      }
    }
  },

  /**
   * Give the modal (or its autofocus element) focus
   *
   * @method takeFocus
   * @private
   */
  takeFocus() {
    let modalEl = this.get('modalElement');
    let focusElement = modalEl && modalEl.querySelector('[autofocus]');
    if (!focusElement) {
      focusElement = modalEl;
    }
    if (focusElement) {
      focusElement.focus();
    }
  },

  /**
   * Show the modal
   *
   * @method show
   * @private
   */
  show() {
    if (this._isOpen) {
      return;
    }
    this._isOpen = true;

    document.body.classList.add('modal-open');

    this.resize();

    let callback = () => {
      if (this.get('isDestroyed')) {
        return;
      }

      this.checkScrollbar();
      this.setScrollbar();

      schedule('afterRender', () => {
        let modalEl = this.get('modalElement');
        if (!modalEl) {
          return;
        }

        modalEl.scrollTop = 0;
        this.handleUpdate();
        this.set('showModal', true);
        this.get('onShow')();

        if (this.get('usesTransition')) {
          transitionEnd(this.get('modalElement'), this.get('transitionDuration'))
            .then(() => {
              this.takeFocus();
              this.get('onShown')();
            });
        } else {
          this.takeFocus();
          this.get('onShown')();
        }
      });
    };
    if (this.get('inDom') !== true) {
      this.set('inDom', true);
    }
    this.handleBackdrop(callback);
  },

  /**
   * Hide the modal
   *
   * @method hide
   * @private
   */
  hide() {
    if (!this._isOpen) {
      return;
    }
    this._isOpen = false;

    this.resize();
    this.set('showModal', false);

    if (this.get('usesTransition')) {
      transitionEnd(this.get('modalElement'), this.get('transitionDuration'))
        .then(() => this.hideModal());
    } else {
      this.hideModal();
    }
  },

  /**
   * Clean up after modal is hidden and call onHidden
   *
   * @method hideModal
   * @private
   */
  hideModal() {
    if (this.get('isDestroyed')) {
      return;
    }

    this.handleBackdrop(() => {
      document.body.classList.remove('modal-open');
      this.resetAdjustments();
      this.resetScrollbar();
      this.set('inDom', false);
      this.get('onHidden')();
    });
  },

  /**
   * SHow/hide the backdrop
   *
   * @method handleBackdrop
   * @param callback
   * @private
   */
  handleBackdrop(callback) {
    let doAnimate = this.get('usesTransition');

    if (this.get('isOpen') && this.get('backdrop')) {
      this.set('showBackdrop', true);

      if (!callback) {
        return;
      }

      schedule('afterRender', this, function() {
        let backdrop = this.get('backdropElement');
        assert('Backdrop element should be in DOM', backdrop);
        if (doAnimate) {
          transitionEnd(backdrop, this.get('backdropTransitionDuration'))
            .then(callback);
        } else {
          callback();
        }
      });

    } else if (!this.get('isOpen') && this.get('backdrop')) {
      let backdrop = this.get('backdropElement');
      assert('Backdrop element should be in DOM', backdrop);

      let callbackRemove = () => {
        if (this.get('isDestroyed')) {
          return;
        }
        this.set('showBackdrop', false);
        if (callback) {
          callback.call(this);
        }
      };
      if (doAnimate) {
        transitionEnd(backdrop, this.get('backdropTransitionDuration'))
          .then(callbackRemove);
      } else {
        callbackRemove();
      }
    } else if (callback) {
      next(this, callback);
    }
  },

  /**
   * Attach/Detach resize event listeners
   *
   * @method resize
   * @private
   */
  resize() {
    if (this.get('isOpen')) {
      this._handleUpdate = bind(this, this.handleUpdate);
      window.addEventListener('resize', this._handleUpdate, false);
    } else {
      window.removeEventListener('resize', this._handleUpdate, false);
    }
  },

  /**
   * @method handleUpdate
   * @private
   */
  handleUpdate() {
    this.adjustDialog();
  },

  /**
   * @method adjustDialog
   * @private
   */
  adjustDialog() {
    let modalIsOverflowing = this.get('modalElement').scrollHeight > document.documentElement.clientHeight;
    this.setProperties({
      paddingLeft: !this.bodyIsOverflowing && modalIsOverflowing ? this.get('scrollbarWidth') : null,
      paddingRight: this.bodyIsOverflowing && !modalIsOverflowing ? this.get('scrollbarWidth') : null
    });
  },

  /**
   * @method resetAdjustments
   * @private
   */
  resetAdjustments() {
    this.setProperties({
      paddingLeft: null,
      paddingRight: null
    });
  },

  /**
   * @method checkScrollbar
   * @private
   */
  checkScrollbar() {
    let fullWindowWidth = window.innerWidth;
    if (!fullWindowWidth) { // workaround for missing window.innerWidth in IE8
      let documentElementRect = document.documentElement.getBoundingClientRect();
      fullWindowWidth = documentElementRect.right - Math.abs(documentElementRect.left);
    }

    this.bodyIsOverflowing = document.body.clientWidth < fullWindowWidth;
  },

  /**
   * @method setScrollbar
   * @private
   */
  setScrollbar() {
    let bodyPad = parseInt((document.body.style.paddingRight || 0), 10);
    this._originalBodyPad = document.body.style.paddingRight || '';
    if (this.bodyIsOverflowing) {
      document.body.style.paddingRight = bodyPad + this.get('scrollbarWidth');
    }
  },

  /**
   * @method resetScrollbar
   * @private
   */
  resetScrollbar() {
    document.body.style.paddingRight = this._originalBodyPad;
  },

  /**
   * @property scrollbarWidth
   * @type number
   * @readonly
   * @private
   */
  scrollbarWidth: computed(function() {
    let scrollDiv = document.createElement('div');
    scrollDiv.className = 'modal-scrollbar-measure';
    let modalEl = this.get('modalElement');
    modalEl.parentNode.insertBefore(scrollDiv, modalEl.nextSibling);
    let scrollbarWidth = scrollDiv.offsetWidth - scrollDiv.clientWidth;
    scrollDiv.parentNode.removeChild(scrollDiv);
    return scrollbarWidth;
  }),

  didInsertElement() {
    this._super(...arguments);
    if (this.get('isOpen')) {
      this.show();
    }
  },

  willDestroyElement() {
    this._super(...arguments);
    window.removeEventListener('resize', this._handleUpdate, false);
    document.body.classList.remove('modal-open');
    this.resetScrollbar();
  },

  _observeOpen: observer('isOpen', function() {
    if (this.get('isOpen')) {
      this.show();
    } else {
      this.hide();
    }
  }),

  init() {
    this._super(...arguments);
    let { isOpen, backdrop, fade } = this.getProperties('isOpen', 'backdrop', 'fade');
    let isFB = isFastBoot(this);
    if (fade === undefined) {
      fade = !isFB;
    }
    this.setProperties({
      showModal: isOpen && (!fade || isFB),
      showBackdrop: isOpen && backdrop,
      inDom: isOpen,
      fade,
      destinationElement: getDestinationElement(this)
    });
  }
});

Object.defineProperties(component.prototype, {

  /**
   * The DOM element of the `.modal` element.
   *
   * @property modalElement
   * @type object
   * @readonly
   * @private
   */
  modalElement: {
    get() {
      return document.getElementById(this.get('modalId'));
    }
  },

  /**
   * The DOM element of the backdrop element.
   *
   * @property backdropElement
   * @type object
   * @readonly
   * @private
   */
  backdropElement: {
    get() {
      return document.getElementById(this.get('backdropId'));
    }
  }
});

export default component;
