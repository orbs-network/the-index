// manual optimization to get all BAT ERC20 contract holders without (slow) EVM calls
// works by manually calculating the storage slot of each user's balance

// warning: this optimization may not work for tokens that have logic in balanceOf
// for example rebalancing tokens, yield bearing tokens or fee carrying tokens
// this can be checked automatically by calling balanceOf on the first transfer and checking if the result matches

class Schema {
  async onInit(web3, data) {
    data.trackState();
    this.web3 = web3;
    this.batContract = this.web3.Contract(batContractAbi, "0x0D8775F648430679A709E98d2b0Cb6250d2887EF");
    // storage slot of balances map: mapping (address => uint256) balances;
    // https://etherscan.io/bytecode-decompiler?a=0x0d8775f648430679a709e98d2b0cb6250d2887ef (balanceOf at storage *1*)
    this.batBalancesSlot = "0000000000000000000000000000000000000000000000000000000000000001";
  }

  async onBlock(blockNumber) {
    const events = await this.batContract.getEvents("Transfer");
    if (events.length > 0) {
      console.log(`block ${blockNumber}:`);
      for (const event of events) {
        const fromBalance = await this.batContract.getStorageAt(
          this.getAddressMapSlot(event.returnValues._from, this.batBalancesSlot)
        );
        console.log(`address: ${event.returnValues._from}, balance: ${fromBalance}`);
        const toBalance = await this.batContract.getStorageAt(
          this.getAddressMapSlot(event.returnValues._to, this.batBalancesSlot)
        );
        console.log(`address: ${event.returnValues._to}, balance: ${toBalance}`);
      }
    }
  }

  // returns the storage slot of an EVM map keyed by addresses (20 byte hex strings)
  // which is defined as the keccak256 of the 32-byte address concat with the 32-byte map slot
  getAddressMapSlot(address, mapSlot) {
    return this.web3.utils.keccak256(this.web3.utils.padLeft(address, 64) + mapSlot);
  }
}

module.exports = Schema;

const batContractAbi =
  '[{"constant":true,"inputs":[],"name":"batFundDeposit","outputs":[{"name":"","type":"address"}],"payable":false,"type":"function"},{"constant":true,"inputs":[],"name":"name","outputs":[{"name":"","type":"string"}],"payable":false,"type":"function"},{"constant":false,"inputs":[{"name":"_spender","type":"address"},{"name":"_value","type":"uint256"}],"name":"approve","outputs":[{"name":"success","type":"bool"}],"payable":false,"type":"function"},{"constant":true,"inputs":[],"name":"totalSupply","outputs":[{"name":"","type":"uint256"}],"payable":false,"type":"function"},{"constant":true,"inputs":[],"name":"batFund","outputs":[{"name":"","type":"uint256"}],"payable":false,"type":"function"},{"constant":false,"inputs":[{"name":"_from","type":"address"},{"name":"_to","type":"address"},{"name":"_value","type":"uint256"}],"name":"transferFrom","outputs":[{"name":"success","type":"bool"}],"payable":false,"type":"function"},{"constant":true,"inputs":[],"name":"decimals","outputs":[{"name":"","type":"uint256"}],"payable":false,"type":"function"},{"constant":true,"inputs":[],"name":"tokenExchangeRate","outputs":[{"name":"","type":"uint256"}],"payable":false,"type":"function"},{"constant":false,"inputs":[],"name":"finalize","outputs":[],"payable":false,"type":"function"},{"constant":true,"inputs":[],"name":"version","outputs":[{"name":"","type":"string"}],"payable":false,"type":"function"},{"constant":false,"inputs":[],"name":"refund","outputs":[],"payable":false,"type":"function"},{"constant":true,"inputs":[],"name":"tokenCreationCap","outputs":[{"name":"","type":"uint256"}],"payable":false,"type":"function"},{"constant":true,"inputs":[{"name":"_owner","type":"address"}],"name":"balanceOf","outputs":[{"name":"balance","type":"uint256"}],"payable":false,"type":"function"},{"constant":true,"inputs":[],"name":"isFinalized","outputs":[{"name":"","type":"bool"}],"payable":false,"type":"function"},{"constant":true,"inputs":[],"name":"fundingEndBlock","outputs":[{"name":"","type":"uint256"}],"payable":false,"type":"function"},{"constant":true,"inputs":[],"name":"symbol","outputs":[{"name":"","type":"string"}],"payable":false,"type":"function"},{"constant":true,"inputs":[],"name":"ethFundDeposit","outputs":[{"name":"","type":"address"}],"payable":false,"type":"function"},{"constant":false,"inputs":[{"name":"_to","type":"address"},{"name":"_value","type":"uint256"}],"name":"transfer","outputs":[{"name":"success","type":"bool"}],"payable":false,"type":"function"},{"constant":false,"inputs":[],"name":"createTokens","outputs":[],"payable":true,"type":"function"},{"constant":true,"inputs":[],"name":"tokenCreationMin","outputs":[{"name":"","type":"uint256"}],"payable":false,"type":"function"},{"constant":true,"inputs":[],"name":"fundingStartBlock","outputs":[{"name":"","type":"uint256"}],"payable":false,"type":"function"},{"constant":true,"inputs":[{"name":"_owner","type":"address"},{"name":"_spender","type":"address"}],"name":"allowance","outputs":[{"name":"remaining","type":"uint256"}],"payable":false,"type":"function"},{"inputs":[{"name":"_ethFundDeposit","type":"address"},{"name":"_batFundDeposit","type":"address"},{"name":"_fundingStartBlock","type":"uint256"},{"name":"_fundingEndBlock","type":"uint256"}],"payable":false,"type":"constructor"},{"anonymous":false,"inputs":[{"indexed":true,"name":"_to","type":"address"},{"indexed":false,"name":"_value","type":"uint256"}],"name":"LogRefund","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"name":"_to","type":"address"},{"indexed":false,"name":"_value","type":"uint256"}],"name":"CreateBAT","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"name":"_from","type":"address"},{"indexed":true,"name":"_to","type":"address"},{"indexed":false,"name":"_value","type":"uint256"}],"name":"Transfer","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"name":"_owner","type":"address"},{"indexed":true,"name":"_spender","type":"address"},{"indexed":false,"name":"_value","type":"uint256"}],"name":"Approval","type":"event"}]';
