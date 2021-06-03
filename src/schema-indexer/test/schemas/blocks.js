// find all blocks with hash that starts with 0x12345

class Schema {
  async onInit(web3) {
    this.web3 = web3;
  }

  async onBlock(blockNumber) {
    const block = await this.web3.getBlock();
    if (block.hash.startsWith("0x12345")) {
      console.log(`block ${blockNumber}:`);
      console.dir(block);
    }
  }
}

module.exports = Schema;
