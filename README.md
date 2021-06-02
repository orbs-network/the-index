# The Index

Process TheIndex schemas over EVM index data in scale.

## Build

```
npm install
```

## Test

### Print RLP contents

```
npm run rlp-read ~/go/src/github.com/orbs-network/the-index-go-ethereum/the-index/blocks-00001.rlp
```

### Run test schemas

1. Populate `src/schema-indexer/test/data` with test data:

    ```
    scp -i ssh.pem "ubuntu@1.2.3.4:/data/the-index/*" src/schema-indexer/test/data
    ```

2. List all available test schemas:

    ```
    npm run test-schema
    ```

3. Run one of the test schemas:

    ```
    npm run test-schema blocks
    ```