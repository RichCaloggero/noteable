class Key {
#separator = "+";
#keyNameMap = new Map([
["ctrlKey", "control"],
["altKey", "alt"],
["shiftKey", "shift"],
["metaKey", "meta"]
]); // map
#modifierNames = [...this.#invertMap(this.#keyNameMap).keys()];
#event = null;
#key = null;


constructor (e) {
this.#event = e;
this.#key = this.#eventToKey(e);
} // constructor

toString () {return this.#key.join(this.#separator);}

#eventToKey (e, ignoreUnadornedModifier = true, convertKeyNames = false, convertCase = false) {
if (ignoreUnadornedModifier && this.#modifierNames.includes(e.key.toLowerCase())) return [];

const map = this.#invertMap(this.#keyNameMap);
const key = this.#modifierNames
.map(modifier => e[map.get(modifier)]? modifier : null)
.filter(modifier => modifier);

if (convertKeyNames && e.key === " ") key.push("space");
else if (e.key.length > 1) key.push(convertCase? e.key.toLowerCase() : e.key);
else key.push(e.key);

return key;
} // eventToKey

#invertMap (map) {
return new Map(
[...map.entries()].map(x => [x[1],x[0]])
); // new Map
} // invertMap
} // class Key

/// tests

console.assert(new Key({ctrlKey:true, shiftKey:true, altKey: true, key: " "}).toString() === new Key({altKey: true, key: " ", ctrlKey:true, shiftKey:true}).toString());

