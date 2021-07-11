# The Index

Process TheIndex schemas over EVM index data in scale.

## How to write schemas

A schema is a simple JavaScript file that is executed by TheIndex engine.

See several examples for schemas [here](./src/schema-indexer/test/schemas).

The API available to you is documented [here](./src/schema-indexer/interfaces.ts).

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
    
    Here is a small amount of test data from Ethereum mainnet (up until block 4,000,000 approx) - [zip](https://drive.google.com/file/d/1LhEwFAH2LEPXtXjepJH01m4il2-CMXPT/view?usp=sharing)

2. List all available test schemas:

    ```
    npm run test-schema
    ```

3. Run one of the test schemas:

    ```
    npm run test-schema blocks
    ```
