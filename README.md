# PlanBundle Command Line Interface

Provides command line functions for administering cloud firestore and elasticsearch.

The commands are designed to be scalable by processing in batches where appropriate 
and controlling concurrency with various constraints.  The batch delete code from 
[firebase-tools](https://github.com/firebase/firebase-tools/blob/master/src/firestore/delete.js) 
was used as a basis for the firestore document hierarchy traversal and
batch processing.  [RxJS](https://github.com/ReactiveX/rxjs) was used for the restore 
command to provide simlar batch concurrency control for file directory traversal and processing.

The command framework allows for additional functions to be added.

The CLI uses the [commander](https://github.com/tj/commander.js/) package for processing commands.
Command handlers are loaded based on the `commands` array in [src/index.js](src/index.js).

```javascript
const commands = [
  './elasticsearch/commands/elasticsearch', 
  './firestore/commands/firestore',
  './test/commands/test'
]
```

Commands must export a function: 

```javascript
addCommand(program, config, admin)
```

that add appropriate subcommands.

```
   @param {object} program - command line program object (see commander package)
   @param {object} config - configuration object - can be used by command for settings
   @param {object} admin - firebase admin api object
```

Command line uses subcommands based on command objects

Usage: 
```
$ bundle [<subcommand> [<subcommand options> [--help]]] | --version | --help
```

## Logging

Logging uses pino:  https://github.com/pinojs/pino

Set log level using LEVEL environment variable:

```
$ export LEVEL=info
```

The default level is `info`.
Available levels are: 
- fatal
- error
- warn
- info
- debug
- trace
- silent

### Console Output

Output displayed on the interactive console will be displayed with colors and without timestamps by default.  To have console output in pino (json) format, add the following to config:

```javascript
  "logger": {
    "prettyPrint": false
  },
```

Note that even with prettyPrint set to false, redirected output will be in pino (json) format.  This output can be piped to [pino-pretty](https://github.com/pinojs/pino-pretty), [pino-colada](https://github.com/lrlna/pino-colada) or pino [transports]( https://github.com/pinojs/pino/blob/master/docs/transports.md).

For example, to use pino-colada:

```
$ bundle firestore-docs -p col1 -s | pino-colada
```

## Debug Support
Bundle supports debug logging using the debug package (https://github.com/visionmedia/debug).

Enable debug logging using:

```
$ export DEBUG=*
```

To filter debug modules:

- For all bundle module debug:  

    ```$ export DEBUG=bundle:*```

- For specific bundle module debug (example):  

    ```$ export DEBUG=bundle:traverseBatch```

**Note**: LEVEL must be set to 'debug' or higher for debug messages to be included.

Modules with debug:

- bundle:delete
- bundle:restore
- bundle:traverseBatch
- bundle:elasticsearch

# Configuration

The command line utility uses [config](https://github.com/lorenwest/node-config) for command configuration.  The default configuration file will be loaded from [config/default.json](config/default.json). 

The `NODE_ENV` environment variable can be changed to use different configuration files. For example, to load the configuration files for production from the file `config/production.json`, set the `NODE_ENV` as follows:

```
$ export NODE_ENV=production
```

## Notes on Setting Up CLI

The Command Line Utility is not packaged for npm and requires setup to use as a node utility. 

The entry point for the CLI is [src/index.js](src/index.js), which includes the shebang line to associate the file with node.js:

```javascript
#!/usr/bin/env node
```

[index.js](src/index.js) must also be set to be executable:

```
chmod +x index.js
```

To make index.js the default executable for the packahe, "bin" is set in package.json as follows:

```javascript
"bin": {
  "bundle": "./src/index.js"
}
```

To make the CLI available as an executable during development before depolying to npm, use `npm link`:

```
npm link
```

# Commands

The command line interface requires firebase [configuration](#configuration) as follows:

```javascript
"firebase": {
    "keyFilename": ".keys/path-to-your-firebase-keyfile.json",
    "databaseURL": "https://your-firestore-database-url.firebaseio.com",
    "projectId": "your-project-id"
  }
```

## Cloud Firestore

### Document Selection

Cloud firestore commands support various options for selecting documents.  To support scalability, 
a [StructuredQuery](https://cloud.google.com/firestore/docs/reference/rest/v1/StructuredQuery) is used to 
select documents in batches.  This approach does constrain document selection.  For example, there is no
direct way to perform a regular expression-like filtered query of document parths against firestore.  
However, several options are available to address most scenarios.  For example, using a recursive selection
from a starting collection path combined with a defined `collectionId` for a sub-collection allows for 
selection of sub-collections across a sub-tree in the database.

To simplify the use of multiple selection options, [Document Sets](#Document-Sets-(DocSets)) may be defined in the configuration file 
and used in commands (see [below](#Document-Sets-(DocSets))).

The options available for document selection are:

|Option|Description|Notes|
|------|-----------|-----|
|`-p, --path <path>`|The base path of the documents.  May be a collection or document.|

### Document Sets (DocSets)

Document Sets ("`DocSet`") are shorthand references to sets of documents.  DocSets define selection crieria for easy reference when using firestore commands.  DocSets are defined in the configuration file.

Consider a document hierarchy as follows:

```
users
  - user1
    - posts
      - user1post1
      - user1post2
    - addresses
      - address1
      - address2
  - user2
    - posts
      - user2post1
      - user2post2
    - addresses
      - address 1
regions
  - region1
  - region2
```

To define a DocSet for posts for all users, the following configuration can be used:

```javascript
"firestore": {
  "docSets": {
    "userPosts": {
      "path": "users",
      "collectionId": "posts",
      "recursive": true
    }
  }
}
```

In this example, `userPosts` is the name of the DocSet.  This name can be used in commands.  For example, to list the paths for all user post documents:

```
bundle firestore-docs userPosts
```

To display the full documents for all of the user posts:

```
bundle firestore-docs userPosts --verbose
```


## Cloud Firestore Commands

### firestore-docs


```
firestore-docs [docSetId]
```



## Elasticsearch

## To Add

- How to create from command line
- CLI framework
  - framework approach
  - commander
  - config
  - pino logging
  - debug
  - Colors

- elasticsearch
  - config
  - keys
  - commands
  - schemas

- firestore
  - keys
  - commands
  - TraverseBatch notes
  - directory traversal with rxjs


