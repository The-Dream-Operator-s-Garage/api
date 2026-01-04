# PathChain Library Documentation

## Overview

PathChain is a Node.js library for creating and managing hierarchical data structures using Protocol Buffers. The library provides functions to create, retrieve, and manipulate various types of objects (moments, entities, secrets, nodes, links, paths, and labels) that are stored as Protocol Buffer-encoded files in a filesystem structure.

## Core Concepts

### Protocol Buffers
All objects in PathChain are encoded using Protocol Buffers (protobuf), a language-neutral, platform-neutral extensible mechanism for serializing structured data. Each object type has a corresponding `.proto` file that defines its structure.

### File Storage Structure
Objects are stored in a `files/` directory with the following structure:
```
files/
├── moments/
├── entities/
├── pioneer/
├── secrets/
├── {author}/secrets/
├── {author}/entities/
├── {author}/nodes/
├── {author}/links/
├── {author}/paths/
└── {author}/labels/
```

### Hash-Based Identification
All objects are identified by SHA-256 hashes computed from their content. These hashes serve as filenames and unique identifiers.

### Author System
Objects can be created by specific authors (entities). When an author is specified, objects are stored in author-specific subdirectories. If no author is provided, the pioneer (first entity) is used as the default author.

## Protocol Buffer Definitions

### moment.proto
Represents a point in time and space.

**Message Structure:**
```protobuf
message moment {
    message space {
        message position {
            optional double x = 1;
            optional double y = 2;
            optional double z = 3;
        }
        optional float lat = 1;
        optional float lon = 2;
        optional position xyz = 3;
    }
    message time {
        optional int32 Y = 1;      // Year
        optional int32 M = 2;       // Month
        optional int32 D = 3;      // Day
        optional int32 H = 4;      // Hour (24-hour format)
        optional int32 A = 5;      // AM/PM indicator
        optional int32 h = 6;      // Hour (12-hour format)
        optional int32 m = 7;      // Minute
        optional int32 s = 8;      // Second
        optional int32 S = 9;      // Millisecond
        optional int32 Z = 10;     // Timezone offset
        optional int32 _index = 11;
        optional int32 _length = 12;
        optional int32 _match = 13;
    }
    optional space coordinates = 1;
    optional time datetime = 2;
}
```

**Usage:** Moments are used as timestamps for all other objects. They store both temporal (datetime) and spatial (coordinates) information.

### entity.proto
Represents an entity (user/actor) in the system.

**Message Structure:**
```protobuf
message entity {
    required string register = 1;  // Path to moment of registration
    required string ancestor = 2;  // Path to ancestor entity
    required string tag = 3;       // Path to this entity
}
```

**Usage:** Entities are the actors in the system. The first entity is called the "pioneer" and has itself as its ancestor. Other entities are created using secrets and reference their creator as ancestor.

### secret.proto
Represents a secret used for entity creation.

**Message Structure:**
```protobuf
message secret {
    required string register = 1;  // Path to moment of registration
    required string author = 2;     // Path to author entity
    required string user = 3;       // Path to user entity (set when used)
    required bool used = 4;         // Whether secret has been used
    required string tag = 5;        // Path to this secret
}
```

**Usage:** Secrets are single-use tokens for creating new entities. Once used, they cannot be reused. The pioneer gets one secret automatically.

### node.proto
Represents a node (content item).

**Message Structure:**
```protobuf
message node {
    required string register = 1;  // Path to moment of creation
    required string author = 2;    // Path to author entity
    required string text = 3;      // Node content/text
    required string tag = 4;       // Path to this node
}
```

**Usage:** Nodes store text content created by entities. They are the basic content units in the system.

### link.proto
Represents a link connecting objects in a chain.

**Message Structure:**
```protobuf
message link {
    required string register = 1;  // Path to moment of creation
    required string author = 2;    // Path to author entity
    required string prev = 3;       // Path to previous link
    required string next = 4;       // Path to next link
    required string target = 5;     // Path to target object
    required string ancestor = 6;   // Path to ancestor link
    required string tag = 7;        // Path to this link
}
```

**Usage:** Links form chains connecting objects. They have bidirectional references (prev/next) and point to a target object. Links are used to build paths.

### path.proto
Represents a path (ordered sequence of objects).

**Message Structure:**
```protobuf
message path {
    required string register = 1;  // Path to moment of creation
    required string author = 2;    // Path to author entity
    required string text = 3;      // Path description
    required string head = 4;       // Path to head link
    required string ancestor = 5;   // Path to ancestor path
    optional string chain = 6;      // Chain information
    required string tag = 7;       // Path to this path
}
```

**Usage:** Paths represent ordered sequences of objects connected via links. The head link points to the most recently added element. Paths can have hierarchical relationships via ancestors.

### label.proto
Represents a label (categorization tag).

**Message Structure:**
```protobuf
message label {
    required string register = 1;  // Path to moment of creation
    required string author = 2;     // Path to author entity
    required string text = 3;        // Label text
    required string ancestor = 4;    // Path to ancestor label
    required string tag = 5;         // Path to this label
}
```

**Usage:** Labels provide hierarchical categorization. They can have ancestor labels to create label hierarchies.

## Function Reference

### Utility Functions

#### hello(name)
**Purpose:** Greeting function for testing.

**Parameters:**
- `name` (string, optional, default="nameless entity"): Name to greet

**Returns:** `string` - Greeting message

**Example:**
```javascript
const pathchain = require('pathchain');
pathchain.hello("Alice"); // "Hello from the Dream Operator's Garage, Alice"
```

---

### Moment Functions

#### makeMoment(datetime, lat, lon, x, y, z, format)
**Purpose:** Creates a moment Protocol Buffer representing a point in time and space.

**Parameters:**
- `datetime` (string, optional, default=current datetime): Datetime string
- `lat` (float, optional, default=0): Latitude
- `lon` (float, optional, default=0): Longitude
- `x` (float, optional, default=0): X coordinate
- `y` (float, optional, default=0): Y coordinate
- `z` (float, optional, default=0): Z coordinate
- `format` (string, optional, default='MM DD YYYY HH:mm:SSS [GMT]Z'): Date format

**Returns:** `string` - Moment hash (SHA-256)

**Protocol Buffer:** Uses `moment.proto`

**Storage:** `files/moments/{moment_hash}`

**Example:**
```javascript
const momentHash = pathchain.makeMoment("01 15 2024 10:30:000 [GMT]-0500", 40.7128, -74.0060);
```

#### getMomentObj(xmoment)
**Purpose:** Retrieves and decodes a moment object from file.

**Parameters:**
- `xmoment` (string, required): Moment hash or path (e.g., "moments/hash")

**Returns:** `Object|string` - Decoded moment object or error message

**Protocol Buffer:** Uses `moment.proto` for decoding

**Example:**
```javascript
const momentObj = pathchain.getMomentObj(momentHash);
// Returns: { coordinates: { lat: 40.7128, lon: -74.0060, xyz: {...} }, datetime: {...} }
```

---

### Pioneer Functions

#### makePioneer(datetime, format)
**Purpose:** Creates the pioneer (first entity) in the system. The pioneer is the root entity that all other entities descend from.

**Parameters:**
- `datetime` (string, optional, default=current datetime): Creation datetime
- `format` (string, optional, default='MM DD YYYY HH:mm:SSS [GMT]Z'): Date format

**Returns:** `string` - Pioneer entity hash

**Protocol Buffer:** Uses `entity.proto`

**Dependencies:**
- Creates a moment for registration (uses `moment.proto`)
- Creates a moment for birthday (uses `moment.proto`)
- Automatically creates a secret for the pioneer (uses `secret.proto`)

**Storage:**
- `files/entities/{pioneer_hash}`
- `files/pioneer/{pioneer_hash}`

**Behavior:** Only one pioneer can exist. If called when pioneer already exists, returns existing pioneer hash.

**Example:**
```javascript
const pioneerHash = pathchain.makePioneer();
```

#### getPioneerObj(xpioneer)
**Purpose:** Retrieves and decodes a pioneer object.

**Parameters:**
- `xpioneer` (string, required): Pioneer hash

**Returns:** `Object|string` - Decoded entity object or error message

**Protocol Buffer:** Uses `entity.proto` for decoding

**Example:**
```javascript
const pioneerObj = pathchain.getPioneerObj(pioneerHash);
// Returns: { register: "moments/...", ancestor: "entities/...", tag: "entities/..." }
```

---

### Entity Functions

#### makeEntity(xsecret, format)
**Purpose:** Creates a new entity using a secret. The secret must be unused.

**Parameters:**
- `xsecret` (string, required): Secret hash to use for entity creation
- `format` (string, optional, default='MM DD YYYY HH:mm:SSS [GMT]Z'): Date format

**Returns:** `string` - Entity hash or error message

**Protocol Buffer:** Uses `entity.proto`

**Dependencies:**
- Creates a moment for registration (uses `moment.proto`)
- Retrieves secret object to get author (uses `secret.proto`)
- Updates secret to mark as used (uses `secret.proto`)

**Storage:** `files/entities/{entity_hash}` or `files/{author}/entities/{entity_hash}`

**Behavior:** 
- If no entities exist, returns error suggesting to create pioneer first
- If secret is already used, returns error message
- Automatically marks secret as used

**Example:**
```javascript
const entityHash = pathchain.makeEntity(secretHash);
```

#### getEntityObj(xentity, xauthor)
**Purpose:** Retrieves and decodes an entity object.

**Parameters:**
- `xentity` (string, required): Entity hash
- `xauthor` (string, optional, default=""): Author path for locating entity

**Returns:** `Object|string` - Decoded entity object or error message

**Protocol Buffer:** Uses `entity.proto` for decoding

**Example:**
```javascript
const entityObj = pathchain.getEntityObj(entityHash);
// Returns: { register: "moments/...", ancestor: "entities/...", tag: "entities/..." }
```

---

### Secret Functions

#### makeSecret(author, format)
**Purpose:** Creates a secret for an entity. Only the pioneer can create secrets initially.

**Parameters:**
- `author` (string, optional, default=pioneer hash): Author entity hash
- `format` (string, optional, default='MM DD YYYY HH:mm:SSS [GMT]Z'): Date format

**Returns:** `string` - Secret hash or error message

**Protocol Buffer:** Uses `secret.proto`

**Dependencies:**
- Creates a moment for registration (uses `moment.proto`)

**Storage:**
- `files/secrets/{secret_hash}`
- `files/{author}/secrets/{secret_hash}`

**Behavior:** Only creates secret if no entities exist yet (pioneer's secret). Otherwise returns error message.

**Example:**
```javascript
const secretHash = pathchain.makeSecret(pioneerHash);
```

#### useSecret(xsecret)
**Purpose:** Marks a secret as used and associates it with a user entity.

**Parameters:**
- `xsecret` (string, required): Secret hash

**Returns:** `Object|string` - Updated secret object or error message

**Protocol Buffer:** Uses `secret.proto` for reading and writing

**Behavior:**
- Sets `used` field to `true`
- Sets `user` field to the entity that used it
- If already used, returns existing object without modification

**Example:**
```javascript
const updatedSecret = pathchain.useSecret(secretHash);
```

#### isSecretUsed(xsecret)
**Purpose:** Checks if a secret has been used.

**Parameters:**
- `xsecret` (string, required): Secret hash

**Returns:** `boolean|string` - `true` if used, `false` if not, or error message

**Protocol Buffer:** Uses `secret.proto` for reading

**Example:**
```javascript
const isUsed = pathchain.isSecretUsed(secretHash);
```

#### getSecretObj(xsecret, xauthor)
**Purpose:** Retrieves and decodes a secret object.

**Parameters:**
- `xsecret` (string, required): Secret hash
- `xauthor` (string, optional, default=""): Author path for locating secret

**Returns:** `Object|string` - Decoded secret object or error message

**Protocol Buffer:** Uses `secret.proto` for decoding

**Example:**
```javascript
const secretObj = pathchain.getSecretObj(secretHash);
// Returns: { register: "moments/...", author: "entities/...", user: "entities/...", used: false, tag: "secrets/..." }
```

---

### Node Functions

#### makeNode(text, xauthor, format)
**Purpose:** Creates a node (content item) with text content.

**Parameters:**
- `text` (string, optional, default=""): Node content text
- `xauthor` (string, optional, default=""): Author entity hash (defaults to pioneer)
- `format` (string, optional, default='MM DD YYYY HH:mm:SSS [GMT]Z'): Date format

**Returns:** `string` - Node hash

**Protocol Buffer:** Uses `node.proto`

**Dependencies:**
- Creates a moment for registration (uses `moment.proto`)

**Storage:** `files/{author}/nodes/{node_hash}` or `files/nodes/{node_hash}` if no author

**Example:**
```javascript
const nodeHash = pathchain.makeNode("Hello, World!", entityHash);
```

#### getNodeObj(xnode, xauthor)
**Purpose:** Retrieves and decodes a node object.

**Parameters:**
- `xnode` (string, required): Node hash
- `xauthor` (string, optional, default=""): Author path for locating node

**Returns:** `Object|string` - Decoded node object or error message

**Protocol Buffer:** Uses `node.proto` for decoding

**Example:**
```javascript
const nodeObj = pathchain.getNodeObj(nodeHash);
// Returns: { register: "moments/...", author: "entities/...", text: "Hello, World!", tag: "nodes/..." }
```

---

### Link Functions

#### makeLink(target, prev, next, xauthor, ancestor, format)
**Purpose:** Creates a link connecting objects in a chain.

**Parameters:**
- `target` (string, required): Path to target object (e.g., "nodes/hash" or "paths/hash")
- `prev` (string, optional, default=link_hash): Path to previous link
- `next` (string, optional, default=link_hash): Path to next link
- `xauthor` (string, optional, default=""): Author entity hash (defaults to pioneer)
- `ancestor` (string, optional, default=link_hash): Path to ancestor link
- `format` (string, optional, default='MM DD YYYY HH:mm:SSS [GMT]Z'): Date format

**Returns:** `string` - Link path (e.g., "links/hash" or "{author}/links/hash") or error message

**Protocol Buffer:** Uses `link.proto`

**Dependencies:**
- Creates a moment for registration (uses `moment.proto`)
- Validates target exists before creating link

**Storage:** `files/{author}/links/{link_hash}` or `files/links/{link_hash}` if no author

**Behavior:**
- Automatically determines target type if not specified in path
- Validates target file exists
- If prev/next/ancestor are empty, defaults to link's own hash (self-reference)

**Example:**
```javascript
const linkHash = pathchain.makeLink("nodes/nodeHash", "", "", entityHash);
```

#### getLinkObj(xlink, xauthor)
**Purpose:** Retrieves and decodes a link object.

**Parameters:**
- `xlink` (string, required): Link hash or path
- `xauthor` (string, optional, default=""): Author path for locating link

**Returns:** `Object|string` - Decoded link object or error message

**Protocol Buffer:** Uses `link.proto` for decoding

**Example:**
```javascript
const linkObj = pathchain.getLinkObj(linkHash);
// Returns: { register: "moments/...", author: "entities/...", prev: "links/...", next: "links/...", target: "nodes/...", ancestor: "links/...", tag: "links/..." }
```

#### setLinkNext(xlink, xnextlink)
**Purpose:** Updates the 'next' pointer of a link.

**Parameters:**
- `xlink` (string, required): Current link hash or path
- `xnextlink` (string, required): Next link hash or path

**Returns:** `string` - Updated link path or error message

**Protocol Buffer:** Uses `link.proto` for reading and writing

**Example:**
```javascript
pathchain.setLinkNext(link1Hash, link2Hash);
```

#### setLinkPrev(xlink, xprevlink)
**Purpose:** Updates the 'previous' pointer of a link.

**Parameters:**
- `xlink` (string, required): Current link hash or path
- `xprevlink` (string, required): Previous link hash or path

**Returns:** `string` - Updated link path or error message

**Protocol Buffer:** Uses `link.proto` for reading and writing

**Example:**
```javascript
pathchain.setLinkPrev(link2Hash, link1Hash);
```

---

### Path Functions

#### makePath(text, head, xauthor, ancestor, format)
**Purpose:** Creates a path (ordered sequence of objects). Note: The actual implementation uses an `elements` array parameter internally, but the exported function signature shows `head`.

**Parameters:**
- `text` (string, optional, default=path_hash): Path description
- `head` (string, optional, default=""): Head link hash (internal implementation uses elements array)
- `xauthor` (string, optional, default=""): Author entity hash (defaults to pioneer)
- `ancestor` (string, optional, default=path_hash): Path to ancestor path
- `format` (string, optional, default='MM DD YYYY HH:mm:SSS [GMT]Z'): Date format

**Returns:** `string` - Path hash

**Protocol Buffer:** Uses `path.proto`

**Dependencies:**
- Creates a moment for registration (uses `moment.proto`)
- Creates links for each element (uses `link.proto`)
- Updates link prev/next pointers (uses `link.proto`)

**Storage:** `files/{author}/paths/{path_hash}` or `files/paths/{path_hash}` if no author

**Behavior:**
- Creates links for each element in the path
- Chains links together using prev/next pointers
- Head link points to the most recently added element
- If text is empty, defaults to path hash
- If ancestor is empty, defaults to path hash (self-reference)

**Example:**
```javascript
const pathHash = pathchain.makePath("My Path", "", entityHash);
```

#### getPathObj(xpath, xauthor)
**Purpose:** Retrieves and decodes a path object.

**Parameters:**
- `xpath` (string, required): Path hash
- `xauthor` (string, optional, default=""): Author path for locating path

**Returns:** `Object|string` - Decoded path object or error message

**Protocol Buffer:** Uses `path.proto` for decoding

**Example:**
```javascript
const pathObj = pathchain.getPathObj(pathHash);
// Returns: { register: "moments/...", author: "entities/...", text: "My Path", head: "links/...", ancestor: "paths/...", tag: "paths/..." }
```

#### getPathChainObj(xpath, xauthor)
**Purpose:** Retrieves a path and all objects in its chain by following links from head to tail.

**Parameters:**
- `xpath` (string, required): Path hash
- `xauthor` (string, optional, default=""): Author path for locating path

**Returns:** `Array|string` - Array of decoded objects in the path chain or error message

**Protocol Buffer:** 
- Uses `path.proto` to get path object
- Uses `link.proto` to decode each link
- Uses appropriate proto (node, path, label) to decode target objects

**Behavior:**
- Starts from head link
- Follows prev pointers backwards through the chain
- Decodes each target object
- Returns array of objects in order (newest to oldest)

**Example:**
```javascript
const chainObjects = pathchain.getPathChainObj(pathHash);
// Returns: [nodeObj1, nodeObj2, nodeObj3, ...]
```

#### getPatheadObj(xpath, xauthor)
**Purpose:** Retrieves path object and the first object in its chain (head link's target).

**Parameters:**
- `xpath` (string, required): Path hash
- `xauthor` (string, optional, default=""): Author path for locating path

**Returns:** `Object|string` - Path object or error message

**Protocol Buffer:**
- Uses `path.proto` to get path object
- Uses `link.proto` to get head link
- Uses appropriate proto to decode head link's target

**Example:**
```javascript
const pathWithHead = pathchain.getPatheadObj(pathHash);
```

---

### Label Functions

#### makeLabel(text, xauthor, ancestor, format)
**Purpose:** Creates a label (categorization tag) with hierarchical support.

**Parameters:**
- `text` (string, required): Label text
- `xauthor` (string, optional, default=""): Author entity hash (defaults to pioneer)
- `ancestor` (string, optional, default=label_hash): Path to ancestor label
- `format` (string, optional, default='MM DD YYYY HH:mm:SSS [GMT]Z'): Date format

**Returns:** `string` - Label hash

**Protocol Buffer:** Uses `label.proto`

**Dependencies:**
- Creates a moment for registration (uses `moment.proto`)

**Storage:** `files/{author}/labels/{label_hash}` or `files/labels/{label_hash}` if no author

**Behavior:**
- If ancestor is empty, defaults to label hash (self-reference, root label)
- Supports hierarchical label structures via ancestor references

**Example:**
```javascript
const labelHash = pathchain.makeLabel("Technology", entityHash, "");
const subLabelHash = pathchain.makeLabel("JavaScript", entityHash, labelHash);
```

#### getLabelObj(xlabel, xauthor)
**Purpose:** Retrieves and decodes a label object.

**Parameters:**
- `xlabel` (string, required): Label hash
- `xauthor` (string, optional, default=""): Author path for locating label

**Returns:** `Object|string` - Decoded label object or error message

**Protocol Buffer:** Uses `label.proto` for decoding

**Example:**
```javascript
const labelObj = pathchain.getLabelObj(labelHash);
// Returns: { register: "moments/...", author: "entities/...", text: "Technology", ancestor: "labels/...", tag: "labels/..." }
```

---

### Generic Functions

#### getObj(xaddress)
**Purpose:** Generic function to retrieve and decode any object type by its address path.

**Parameters:**
- `xaddress` (string, required): Object address path (e.g., "entities/hash", "nodes/hash", "paths/hash")

**Returns:** `Object|string` - Decoded object or error message

**Protocol Buffer:** Automatically determines proto type based on address:
- `entities/` → `entity.proto`
- `labels/` → `label.proto`
- `links/` → `link.proto`
- `moments/` → `moment.proto`
- `nodes/` → `node.proto`
- `paths/` → `path.proto`
- `secrets/` → `secret.proto`

**Example:**
```javascript
const obj = pathchain.getObj("entities/abc123");
const node = pathchain.getObj("nodes/def456");
```

#### getType(xaddress)
**Purpose:** Determines the object type from an address path.

**Parameters:**
- `xaddress` (string, required): Object address path

**Returns:** `string` - Object type name ("entity", "label", "link", "moment", "node", "path", "secret") or error message

**Example:**
```javascript
const type = pathchain.getType("entities/abc123"); // Returns "entity"
const type2 = pathchain.getType("nodes/def456"); // Returns "node"
```

---

## Protocol Buffer Relationships

### Dependency Graph

```
moment (base)
  ├── entity (uses moment for register)
  ├── secret (uses moment for register)
  ├── node (uses moment for register)
  ├── link (uses moment for register)
  ├── path (uses moment for register)
  └── label (uses moment for register)

entity
  ├── secret (references entity as author/user)
  ├── node (references entity as author)
  ├── link (references entity as author)
  ├── path (references entity as author)
  └── label (references entity as author)

link
  ├── path (uses link for head and chain structure)
  └── link (self-referential via prev/next)

path
  └── path (self-referential via ancestor)

label
  └── label (self-referential via ancestor)
```

### Common Patterns

1. **Registration Moments:** All objects (except moments themselves) use moments for their `register` field to track creation time.

2. **Author References:** All authored objects (secret, node, link, path, label) reference an entity as their author via the `author` field.

3. **Hierarchical Structures:**
   - **Entities:** Use `ancestor` to create entity hierarchies
   - **Paths:** Use `ancestor` to create path hierarchies
   - **Labels:** Use `ancestor` to create label hierarchies
   - **Links:** Use `ancestor` to create link hierarchies

4. **Chain Structures:**
   - **Links:** Form bidirectional chains via `prev` and `next` pointers
   - **Paths:** Use links to chain objects together, with `head` pointing to the most recent link

5. **Tag Fields:** All objects have a `tag` field that contains the path to themselves, providing self-reference capability.

## File System Operations

### Directory Management
The library automatically creates necessary directories using `checker.checkDir()`:
- Creates directories recursively if they don't exist
- Used before writing any object files

### File Naming
- All files are named using SHA-256 hashes of their content
- Hash is computed from the decoded JSON representation of the Protocol Buffer
- Ensures content-addressable storage

### Author-Based Organization
- When an author is specified, objects are stored in `files/{author}/{type}/`
- When no author is specified (pioneer), objects are stored in `files/{type}/`
- Secrets are stored in both public (`files/secrets/`) and author-specific (`files/{author}/secrets/`) locations

## Error Handling

All functions return error messages as strings when:
- Files are not found (returns "X not found" messages)
- Invalid operations are attempted (e.g., using already-used secret)
- Required parameters are missing
- File system errors occur

## Usage Examples

### Complete Workflow

```javascript
const pathchain = require('pathchain');

// 1. Create pioneer
const pioneer = pathchain.makePioneer();

// 2. Get pioneer's secret
const pioneerObj = pathchain.getPioneerObj(pioneer);
// Note: Pioneer's secret is created automatically

// 3. Create a node
const node = pathchain.makeNode("Hello World", pioneer);

// 4. Create a label
const label = pathchain.makeLabel("Greeting", pioneer);

// 5. Create a path with multiple nodes
const node1 = pathchain.makeNode("First", pioneer);
const node2 = pathchain.makeNode("Second", pioneer);
const path = pathchain.makePath("My Path", "", pioneer, "");

// 6. Retrieve path chain
const chain = pathchain.getPathChainObj(path, pioneer);
```

## Integration Notes

When integrating PathChain with the TPathos database system:

1. **Entity Mapping:** PathChain entities can map to the `entity` table in the database
2. **Path Mapping:** PathChain paths can map to the `path` field in various database tables
3. **Label Mapping:** PathChain labels can map to the `label` table
4. **Secret Mapping:** PathChain secrets can map to the `secret` table
5. **Moment Mapping:** PathChain moments can be stored as timestamp/moment pairs in the `tevent` table

The Protocol Buffer hashes can serve as unique identifiers that link PathChain objects to database records.

