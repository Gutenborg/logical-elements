# Logical Elements

A set of tools for creating logical HTML.

## A Logical Approach

Most JavaScript frameworks are trying to solve a problem with HTML its lack of logic-based functionality, and focus on adding features that lets you merge features of JavaScript with HTML. They typically do this by bringing the HTML into the JavaScript domain and controlling the DOM sometimes through a virtual DOM and sometimes through a compiler that provides a JS-like experience which handles doing the tedious task of connecting JS and HTML. Each of these tools, React, Vue, Svelte, Ember, etc. requires that the code you write be transformed before a browser can read it.

Logical Elements is an attempt to provide framework-level reactivity and functionality without a build step. It allows you to write HTML that can talk directly to nearby JavaScript, reference deeply nested values, update when values change, and iterate over arrays and objects. In short, it provides elements that have logical functionality.

## Core Approach

The main way that this is achieved is through the use of a few combined browser tools such as:

- Custom Elements
- Mutation Observers
- Object Proxies
- Treewalkers
- Custom Events
- And more!

The elements provided serve as both an authoring tool and as useful ways of providing basic logic in your HtML such as if and else statements and each loops.

### The LogicalElement Class

The first tool is an enhanced HTMLElement class to use when authoring your own custom elements. It features the following enhancements:

- Parsed Callback - Fires when the element has been fully parsed with all of its children. This solves an issue with the Custom Element `connectedCallback` which triggers on the opening tag of an element and doesn't know anything about its children.
- Updated Callback - Fires when a parsed, attributeChanged, childrenModified, or providerUpdated callback is also fired. Will batch any of those events together if they occur at the same time.
- Children Modified Callback - Fires when the tree structure of the children changes.
- Provider Updated Callback - Fires when any parent state provider updates their state.
- Provider Subscriptions - Automatically subscribes to parent state providers and makes them available to the element.
- Update Scheduler - Helps batch updates together to minimize the number of times an element runs its update logic
- Reactive Attribute Namespaces - The ability to define reactive attributes and how to handle them. A reactive attribute will have a handler called on it on every update.
- Each Child Walker - A treewalker that steps through each child of an element and fires a callback function on them.
- Lookup State Values - Lookup values from a parent state provider.

### The ContextElement Class

It extends the LogicalElement class and adds a reactive state to it to become a state provider.

- Reactive State - Uses JavaScript object proxies to capture update events and notify subscribers. Will trigger the `stateUpdated`, `providerUpdated`, and `updated` callbacks.
- State Updated Callback - Fires when the state of this ContextElement instance updates.

### Reactive Attribute Namespaces
One of the main primary functionalities is the ability to declare attribute namespaces that will be evaluated if there is a provider update anywhere above them. Take for example the `attr` namespace. You can use this to assign any value to another attribute on the same element like this:

```html
<le-context name="exampleContext">
    <script>
        function exampleContext (state) {
            return {
                isDisabled: true,
            }
        }
    </script>

    <button attr:disabled="{exampleContext.isDisabled}">This button is disabled</button>
</le-context>
```

The namespace gets broken down in this way:

NAMESPACE:COMMAND="{PROVIDER_NAME.PROPERTY_NAME}"

So, using that information `attr` namespace will look up the value on the context and assign it to the indicated attribute, in this case the `disabled` attribute.

There are four provided reactive namespaces that are assigned by default to the ContextElement class:

- `attr` - Assign values to attributes on the same element, will overwrite any current attribute values
- `cls` - Assign class names conditionally
- `on` - Add event listeners to the element for the specified event
- `set` - Assign values to specific properties such as `textContent`

Any author of a LogicalElement can add their own reactive namespaces to be processed during the `updatedCallback` lifecycle.
