# PlanBundle Command Line Interface

Provides command line functions for administering cloud firestore and elasticsearch.

The commands are designed to be scalable by processing in batches where appropriate 
and controlling concurrency with various constraints.  The batch delete code from 
[firebase-tools](https://github.com/firebase/firebase-tools/blob/master/src/firestore/delete.js) 
was used as a basis for the firestore document hierarchy traversal and
batch processing.  [RxJS](https://github.com/ReactiveX/rxjs) was used for the restore 
command to provide simlar batch concurrency control for file directory traversal and processing.

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

# Cloud Firestore

## Document Selection

Cloud firestore commands support various options for selecting documents.  To support scalability, 
a [StructuredQuery](https://cloud.google.com/firestore/docs/reference/rest/v1/StructuredQuery) is used to 
select documents in batches.  This approach does constrain document selection.  For example, there is no
direct way to perform a regular expression-like filtered query of document paths against firestore. However, several options are available to address most scenarios.  For example, using a recursive selection
from a starting collection path combined with a defined `collectionId` for a sub-collection allows for 
selection of sub-collections across a sub-tree in the database.

To simplify the use of multiple selection options, [Document Sets](#Document-Sets-(DocSets)) may be defined in the configuration file 
and used in commands (see [below](#Document-Sets-(DocSets))).

The options available for document selection are:

|Option|Description|Notes|
|------|-----------|-----|
|`-p, --path <path>`|The base path of the documents|May be a collection or document. If not specified, will include all root collections.|
|`-r, --recursive`|Includes all documents under `path` recursively|Cannot be used with `--shallow`.  One of `--recursive` or `--shallow` must be specified if `path` is a collection.
|`-s, --shallow`|Includes only documents in the collection if `path` is a collection or the documents in the collections directly under the document if `path` is a document|Cannot be used with `--recursive`.  One of `--recursive` or `--shallow` must be specified if `path` is a collection.
|`-c, --collectionId <id>`|Only include documents in collections with name of `id`|
|`-f, --filter <regex>`|Filter results to paths that match the supplied regular expression `regex`|This filter is applied after results are received from the query before processing a document so consider performance and load when using `--filter`. For best results, use `--path` and `--collectionId` to filter the query and then apply `--filter`. Cannot be used with `--idfilter`
|`-i, --idfilter <id>`|Filter results to documents with `id`| This is a special case of `--filter`. Cannot be used with `--filter`.|
|`-m, --min`|Limit results to include only document id and path|Useful when previewing results|

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


# Cloud Firestore Commands

The following sections provide details of the available commands for Cloud Firestore.

## firestore-docs

```
firestore-docs [docSetId]
```
Gets firestore documents with an optional `docSetId`.  If docSetId is not specified and no other selection options are supplied, will include all documents in the database. The specified `docSetId` must be defined in config (see [above](#Document-Sets-(DocSets))).  

### Options

See [Document Selection](#Document-Selection) for details on selection options.

#### Additional Options

|Option|Description
|------|-----------|-----|
|`-v, --verbose`|Includes full document content in results|


## firestore-get

```
firestore-get <path>
```
Gets firestore documents with a `path`.  The `path` may be for a collection or a document.

This command uses the firestore client APIs and does not use the batch processing of other commands like [filrestore-docs](#firestore-docs).  This should be used for single documents for small collections.

### Options

|Option|Description
|------|-----------|-----|
|`-v, --verbose`|Includes full document content in results|

## backup

```
backup [docSetId]
```
Backs up firestore documents with an optional `docSetId`.  If docSetId is not specified and no other selection options are supplied, will include all documents in the database. The specified `docSetId` must be defined in config (see [above](#Document-Sets-(DocSets))).  

The backup files will be places in a subdirectory with a name based on the current timestamp.  A summary of the contents of the backup will be written to a markdown file named `backup-summary.md` in the timestamp subdirectory.

### Options

See [Document Selection](#Document-Selection) for details on selection options.

#### Additional Options

|Option|Description|Notes|
|------|-----------|-----|
|`-b, --basePath <basePath>`|Specifies the base backup path|Overrides `firestore.backupBasePath` in config
|`-y, --bypassConfirm`|Bypasses confirmation prompt|Required when non-interactive stdout|
|`-v, --verbose`|Displays document paths during backup|


## restore

```
restore <basePath>
```
Restores all documents (.json files) under `basePath` to equivalent paths in firestore.

### Options

|Option|Description|Notes|
|------|-----------|-----|
|`-y, --bypassConfirm`|Bypasses confirmation prompt|Required when non-interactive stdout|
|`-v, --verbose`|Displays files during restore|

## upload

```
upload <basePath>
```
The `upload` command is an alias for [restore](#restore). The files under `basePath` don't have to be created by a [backup](#backup) command.  Uploads ("restores") all documents (.json files) under `basePath` to equivalent paths in firestore.

### Options

|Option|Description|Notes|
|------|-----------|-----|
|`-y, --bypassConfirm`|Bypasses confirmation prompt|Required when non-interactive stdout|
|`-v, --verbose`|Displays files during upload|

## delete

```
delete [docSetId]
```
Deletes firestore documents after backing up the files with an optional `docSetId`.  If docSetId is not specified and no other selection options are supplied, will include all documents in the database. The specified `docSetId` must be defined in config (see [above](#Document-Sets-(DocSets))).  

### Options

See [Document Selection](#Document-Selection) for details on selection options.

#### Additional Options

|Option|Description|Notes|
|------|-----------|-----|
|`-b, --basePath <basePath>`|Specifies the base backup path|Overrides `firestore.backupBasePath` in config
|`-y, --bypassConfirm`|Bypasses confirmation prompt|Required when non-interactive stdout|
|`-v, --verbose`|Displays document paths during backup and delete|

## diff

```
diff <basePath> [docSetId]
```
Compares document files under `basePath` with firestore documents with an optional `docSetId`. If docSetId is not specified and no other selection options are supplied, will include all documents in the database. The specified `docSetId` must be defined in config (see [above](#Document-Sets-(DocSets))).

Displays document field changes as well as document adds and deletes.  Optionally creates an html file with the differences.

### Options

See [Document Selection](#Document-Selection) for details on selection options.

#### Additional Options

|Option|Description|Notes|
|------|-----------|-----|
|`-y, --bypassConfirm`|Bypasses confirmation prompt|Required when non-interactive stdout|
|`-w, --html [htmlFilename]`|Produces (web) html summary file with diff details|Uses `debug.outputPath` from config for default directory. Default filename is `<timestamp>.html`.


## validate

```
validate [docSetId]
```
Validates firestore documents with an optional `docSetId`. If docSetId is not specified and no other selection options are supplied, will include all documents in the database. The specified `docSetId` must be defined in config (see [above](#Document-Sets-(DocSets))).

Documents are validated using [JSON Schema](https://json-schema.org/) files that must be defined in config.
The validation is performed using [Ajv](https://github.com/epoberezkin/ajv).

### Schema Configuration

To define the JSON Schemas for firestore documents, document paths are mapped to types.  The types are then mapped to JSON Schema definition files.  Types are defined in the `firestore.types` array. Each entry in the array is an object with `path` and `type` keys.  The `path` is a regular expression that is matched against the document path in firestore.

Schemas are applied to documents for a type based on matching the `path` regular expression.

```javascript
{
  "firestore": {
    "types": [
      { "path": "<path selection regular expression>", "type": "typename"},
      // ... other types
    ]
  }
}
```

For example:

```javascript
{
  "firestore": {
    "types": [
      { "path": "^users\/[^/]+$", "type": "user" },
      { "path": "^users\/[^/]+\/posts\/[^/]+$", "type": "post" }
    ]
  }
}
```

Types are defined in the `schemas` entry in config, which contains entries for each type.  Each entry is an object with `schemaId` string and a `schemaFiles` array.

```javascript
{
  "firestore": {
    "types": [
      { "path": "^users\/[^/]+$", "type": "user" },
      { "path": "^users\/[^/]+\/posts\/[^/]+$", "type": "post" }
    ]
  },

  "schemas": {
    "user": {
      "schemaId": "http://some/schemas/user.schema.json", // should match id in schema file
      "schemaFiles": [
        "./schemas/user.schema.json",                     // the main shcema file
        "./schemas/some.ref.schema.json"                  // other referenced schemas
        "./schemas/some.other.ref.schema.json"
      ]
    },
    "post": {
      "schemaId": "http://some/schemas/post.schema.json", // should match id in schema file
      "schemaFiles": [
        "./schemas/post.schema.json"                      // the main shcema file
      ]
    }
  }
}
```


### Options

See [Document Selection](#Document-Selection) for details on selection options.



# Elasticsearch

- info on AWS
- info on configuration
- info on index / alias structure

https://docs.aws.amazon.com/elasticsearch-service/latest/developerguide/what-is-amazon-elasticsearch-service.html

https://www.elastic.co/guide/en/elasticsearch/reference/6.7/index.html


# Elasticsearch Commands

The following sections provide details of the available commands for AWS Elasticsearch.

## es:create-index

```
es:create-index [index]
```
Creates elasticsearch index definition with the name <index>YYYYMMDDHHmmss. 
Requires a schema configuration entry containing the `indexMapping` file path.
The `indexMapping` file must be json file that conforms to the body format of the elasticsearch [Create Index API](https://www.elastic.co/guide/en/elasticsearch/reference/6.7/indices-create-index.html).




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


