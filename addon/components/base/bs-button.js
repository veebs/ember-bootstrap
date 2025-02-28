import { scheduleOnce } from '@ember/runloop';
import Component from '@ember/component';
import { observer, computed } from '@ember/object';
import { deprecatingAlias, equal, or }  from '@ember/object/computed';
import layout from 'ember-bootstrap/templates/components/bs-button';
import sizeClass from 'ember-bootstrap/utils/cp/size-class';
import typeClass from 'ember-bootstrap/utils/cp/type-class';
import overrideableCP from 'ember-bootstrap/utils/cp/overrideable';

/**
  Implements a HTML button element, with support for all [Bootstrap button CSS styles](http://getbootstrap.com/css/#buttons)
  as well as advanced functionality such as button states.

  ### Basic Usage

  ```hbs
  <BsButton @type="primary" @icon="glyphicon glyphicon-download">
    Downloads
  </BsButton>
  ```

  ### Actions

  Use the `onClick` property of the component to send an action to your controller. It will receive the button's value
  (see the `value` property) as an argument.

  ```hbs
  <BsButton @type="primary" @icon="glyphicon glyphicon-download" @onClick=(action "download")>
    Downloads
  </BsButton>
  ```

  ### Promise support for automatic state change

  When returning a Promise for any asynchronous operation from the `onClick` closure action the button will
  manage an internal state ("default" > "pending" > "fulfilled"/"rejected") automatically, changing its label
  according to the state of the promise:

  ```hbs
  <BsButton
    (at)type="primary"
    (at)icon="glyphicon glyphicon-download"
    (at)defaultText="Download"
    (at)pendingText="Loading..."
    (at)fulfilledText="Completed!"
    (at)rejectedText="Oups!?"
    (at)onClick={{action "download"}}
  />
  ```

  ```js
  // controller.js
  export default Ember.Controller.extend({
    actions: {
      download(value) {
        return new Ember.RSVP.Promise(...);
      }
    }
  });
  ```

  For further customization `isPending`, `isFulfilled`, `isRejected` and `isSettled` properties are yielded:

  ```hbs
  <BsButton @onClick=(action "download") as |button|>
    Download
    {{#if button.isPending}}
      <span class="loading-spinner"></span>
    {{/if}}
  </BsButton>
  ```

  You can `reset` the state represented by these properties and used for button's text by setting `reset` property to
  `true`.

  @class Button
  @namespace Components
  @extends Ember.Component
  @public
*/
export default Component.extend({
  layout,
  tagName: 'button',
  classNames: ['btn'],
  classNameBindings: ['active', 'block:btn-block', 'sizeClass', 'typeClass'],

  attributeBindings: ['_disabled:disabled', 'buttonType:type', 'title'],

  /**
   * Default label of the button. Not need if used as a block component
   *
   * @property defaultText
   * @type string
   * @public
   */
  defaultText: null,

  /**
   * Label of the button used if `onClick` event has returned a Promise which is pending.
   * Not considered if used as a block component.
   *
   * @property pendingText
   * @type string
   * @public
   */
  pendingText: undefined,

  /**
   * Label of the button used if `onClick` event has returned a Promise which succeeded.
   * Not considered if used as a block component.
   *
   * @property fulfilledText
   * @type string
   * @public
   */
  fulfilledText: undefined,

  /**
   * @property resolvedText
   * @type string
   * @deprecated
   * @public
   */
  resolvedText: deprecatingAlias('fulfilledText', {
    id: 'ember-bootstrap.bs-button-resolved-text',
    until: '3.0.0'
  }),

  /**
   * Label of the button used if `onClick` event has returned a Promise which failed.
   * Not considered if used as a block component.
   *
   * @property rejectedText
   * @type string
   * @public
   */
  rejectedText: undefined,

  /**
   * Property to disable the button
   *
   * The button is disabled by default if `preventConcurrency` is `true` and
   * a Promise returned by `onClick` action is pending. You may explicitly
   * enable / disable the button by setting `disabled` to `true` or `false`.
   * Setting it to `null` restores the default behavior.
   *
   * @property disabled
   * @type ?boolean
   * @default null
   * @public
   */
  disabled: null,

  _disabled: computed('disabled', 'isPending', 'preventConcurrency', function() {
    if (this.get('disabled') !== null) {
      return this.get('disabled');
    }

    return this.get('isPending') && this.get('preventConcurrency');
  }),

  /**
   * Set the type of the button, either 'button' or 'submit'
   *
   * @property buttonType
   * @type String
   * @default 'button'
   * @public
   */
  buttonType: 'button',

  /**
   * Set the 'active' class to apply active/pressed CSS styling
   *
   * @property active
   * @type boolean
   * @default false
   * @public
   */
  active: false,

  /**
   * Property for block level buttons
   *
   * See the [Bootstrap docs](http://getbootstrap.com/css/#buttons-sizes)
   * @property block
   * @type boolean
   * @default false
   * @public
   */
  block: false,

  /**
   * A click event on a button will not bubble up the DOM tree if it has an `onClick` action handler. Set to true to
   * enable the event to bubble
   *
   * @property bubble
   * @type boolean
   * @default false
   * @public
   */
  bubble: false,

  /**
   * If button is active and this is set, the icon property will match this property
   *
   * @property iconActive
   * @type String
   * @public
   */
  iconActive: null,

  /**
   * If button is inactive and this is set, the icon property will match this property
   *
   * @property iconInactive
   * @type String
   * @public
   */
  iconInactive: null,

  /**
   * Class(es) (e.g. glyphicons or font awesome) to use as a button icon
   * This will render a <i class="{{icon}}"></i> element in front of the button's label
   *
   * @property icon
   * @type String
   * @readonly
   * @public
   */
  icon: overrideableCP('active', function() {
    if (this.get('active')) {
      return this.get('iconActive');
    } else {
      return this.get('iconInactive');
    }
  }),

  /**
   * Supply a value that will be associated with this button. This will be send
   * as a parameter of the default action triggered when clicking the button
   *
   * @property value
   * @type any
   * @public
   */
  value: null,

  /**
   * Controls if `onClick` action is fired concurrently. If `true` clicking button multiple times will not trigger
   * `onClick` action if a Promise returned by previous click is not settled yet.
   *
   * This does not affect event bubbling.
   *
   * @property preventConcurrency
   * @type Boolean
   * @default true
   * @public
   */
  preventConcurrency: true,

  /**
   * State of the button. The button's label (if not used as a block component) will be set to the
   * `<state>Text` property.
   * This property will automatically be set when using a click action that supplies the callback with a promise.
   * Possible values are: "default" > "pending" > "fulfilled" / "rejected".
   * It could be reseted by `reset` property.
   *
   * @property state
   * @type String
   * @default 'default'
   * @private
   */
  state: 'default',

  /**
   * Promise returned by `onClick` event is pending.
   *
   * @property isPending
   * @type Boolean
   * @private
   */
  isPending: equal('state', 'pending'),

  /**
   * Promise returned by `onClick` event has been succeeded.
   *
   * @property isFulfilled
   * @type Boolean
   * @private
   */
  isFulfilled: equal('state', 'fulfilled'),

  /**
   * Promise returned by `onClick` event has been rejected.
   *
   * @property isRejected
   * @type Boolean
   * @private
   */
  isRejected: equal('state', 'rejected'),

  /**
   * Promise returned by `onClick` event has been succeeded or rejected.
   *
   * @property isFulfilled
   * @type Boolean
   * @private
   */
  isSettled: or('isFulfilled', 'isRejected'),

  /**
   * Set this to `true` to reset the `state`. A typical use case is to bind this attribute with ember-data isDirty flag.
   *
   * The old value is not taken into consideration. Setting a `true` value to `true` again will also reset `state`.
   * In that case it's even to notify the observer system that the property has changed by calling
   * [`notifyPropertyChange()`](https://www.emberjs.com/api/ember/3.2/classes/EmberObject/methods/notifyPropertyChange?anchor=notifyPropertyChange).
   *
   * @property reset
   * @type boolean
   * @public
   */
  reset: null,

  /**
   * Property for size styling, set to 'lg', 'sm' or 'xs'
   *
   * Also see the [Bootstrap docs](https://getbootstrap.com/docs/4.3/components/buttons/#sizes)
   *
   * @property size
   * @type String
   * @public
   */
  size: null,
  sizeClass: sizeClass('btn', 'size'),

  /**
   * Property for type styling
   *
   * For the available types see the [Bootstrap docs](https://getbootstrap.com/docs/4.3/components/buttons/)
   *
   * @property type
   * @type String
   * @default 'default'
   * @public
   */

  typeClass: typeClass('btn', 'type'),

  /**
   * The HTML title attribute
   *
   * @property title
   * @type string
   * @public
   */
  title: null,

  /**
   * When clicking the button this action is called with the value of the button (that is the value of the "value" property).
   *
   * Return a promise object, and the buttons state will automatically set to "pending", "resolved" and/or "rejected".
   * This could be used to automatically set the button's text depending on promise state (`defaultText`, `pendingText`,
   * `fulfilledText`, `rejectedText`) and for futher customization using the yielded `isPending`, `isFulfilled`,
   * `isRejected` properties.
   *
   * The click event will not bubble up, unless you set `bubble` to true.
   *
   * @event onClick
   * @param {*} value
   * @public
   */
  onClick: null,

  /**
   * This will reset the state property to 'default', and with that the button's label to defaultText
   *
   * @method resetState
   * @private
   */
  resetState() {
    this.set('state', 'default');
  },

  resetObserver: observer('reset', function() {
    if (this.get('reset')) {
      scheduleOnce('actions', this, 'resetState');
    }
  }),

  text: computed('state', 'defaultText', 'pendingText', 'fulfilledText', 'rejectedText', function() {
    return this.getWithDefault(`${this.get('state')}Text`, this.get('defaultText'));
  }),

  /**
   * @method click
   * @private
   */
  click() {
    let action = this.get('onClick');
    let preventConcurrency = this.get('preventConcurrency');

    if (action === null || action === undefined) {
      return;
    }

    if (!preventConcurrency || !this.get('isPending')) {
      let promise = (action)(this.get('value'));
      if (promise && typeof promise.then === 'function' && !this.get('isDestroyed')) {
        this.set('state', 'pending');
        promise.then(() => {
          if (!this.get('isDestroyed')) {
            this.set('state', 'fulfilled');
          }
        }, () => {
          if (!this.get('isDestroyed')) {
            this.set('state', 'rejected');
          }
        }
        );
      }
    }

    return this.get('bubble');
  },

  init() {
    this._super(...arguments);
    this.get('reset');
  }

});
