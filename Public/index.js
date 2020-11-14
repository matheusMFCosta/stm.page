//To do: Change element, replace element 
var el = document.querySelector('div');

// <a href="/javascript/manipulation/creating-a-dom-element-51/">create a new element</a> that will take the place of "el"
var newEl = document.createElement('p');
newEl.innerHTML = '<b>Success! Element has been replaced.</b>';

// replace el with newEL
el.parentNode.replaceChild(newEl, el);