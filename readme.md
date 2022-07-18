# Archived for now
This project is archived because it does not make much sense to aggregate best flash loan providers on-chain. Easier to do it offchain, as the loan fees are well known prior to the transaction.

The major limiting factor is the compute limit in Solana - it restricts how much computation can occur in a single transation, and its likely that the operations of flash borrowing, passing on the loan, and then passing it back to the lender will breach the compute limit.

As of 18 July 2022, the implementation of the flash-aggregator is incomplete - it only implements a simple function to borrow from Solend(on Devnet) on behalf of the caller.

# Flash-aggregator

Flash-aggregator brings the cheapest flash loans to Solana. It aggregates all the existing flash loans providers, and returns the flash loan with the lowest possible fee. The platfrom currently accesses the reserves of [Port.finance](https://port.finance/) and [Solend](https://solend.fi/), and more compatible reserves will be added in the future.

With a single [Cross Program Invocation](https://docs.solana.com/developing/programming-model/calling-between-programs#cross-program-invocations), any smart contract can flash borrow from the combined holdings of all the flash loan enabled reserves. This allows anyone to borrow up to 2.5 billion USD worth of tokens from the combined holdings of [Port.finance](https://port.finance/) and [Solend](https://solend.fi/). More lending protocols will added in the future to increase the amount that can be borrowed at once.

Applications for flash loans are:
1. Arbitrage
2. debt refinancing
3. Source of funds for liquidations
4. many more undiscovered applications

# Advantages
* Offload updating list of flash loan providers to the Flash-aggregator smart contract - no need to change source code of caller smart contract when another flash loan provider comes online/goes bust!
* No additional logic required in caller smart contract to borrow from multiple flash loan providers - a single function call to Flash-aggregator to borrow from all available sources.

# Method of operation
When a borrower smart contract requests for a certain amount of funds, the flash aggregator smart contract borrows as much as possible from the pool with the lowest fees. If all that can borrowed has been borrowed from this pool and its not enough, funds are flash borrowed from the next cheapest pool. This goes on until the requested amount of funds are flash borrowed. Then this funds are passed on to the borrower.

The borrower must return the principle along with the fee in order for the transaction to succeed.
Inter program function calls are made with Cross Program invocations.

## Borrowing sequence
[![](https://mermaid.ink/img/pako:eNp9kt1uwjAMhV_FytXQuhfoJqT9sMvdcBsJmcYtEW1SHIdpQrz7XEqHBtNy08g65_Oxm4OpoiNTmkS7TKGiN48NY_doA-jpkcVXvscg8BKZ4ycxYLrcl50q4DUGYazk1lS3mDYrbBqmBiWezO9DDZ4vtb8gU4eH-fyaUUJDshqrbcRwBxK3FArALmbtORsJ1zYlTdASeBg3CbnJdD_qoSaCPbaZbBgxH1EI4l5nndzFbaCffaTTKNV5FMiJEgwZtdEpZNIP1Dk4gKc1zwF57VXaUAGt32XvUHwMoEuJslGeYNqmKcq_O2GSzOHXWmaD0QZTmI64Q-_0Px8GlDUK78iaUq-OasytWGPDUaW51wy0cF6ppqyxTVQYzBKXX6EypXCmSXR-K2fV8Rv5NdNa)](https://mermaid-js.github.io/mermaid-live-editor/edit#pako:eNp9kt1uwjAMhV_FytXQuhfoJqT9sMvdcBsJmcYtEW1SHIdpQrz7XEqHBtNy08g65_Oxm4OpoiNTmkS7TKGiN48NY_doA-jpkcVXvscg8BKZ4ycxYLrcl50q4DUGYazk1lS3mDYrbBqmBiWezO9DDZ4vtb8gU4eH-fyaUUJDshqrbcRwBxK3FArALmbtORsJ1zYlTdASeBg3CbnJdD_qoSaCPbaZbBgxH1EI4l5nndzFbaCffaTTKNV5FMiJEgwZtdEpZNIP1Dk4gKc1zwF57VXaUAGt32XvUHwMoEuJslGeYNqmKcq_O2GSzOHXWmaD0QZTmI64Q-_0Px8GlDUK78iaUq-OasytWGPDUaW51wy0cF6ppqyxTVQYzBKXX6EypXCmSXR-K2fV8Rv5NdNa)

Pseudo code of the aggregation function:
```python

# List sorted by lowest flash fee(%) to highest flash fee(%)
flash_provider_list = [solend, port_finance, flash_provider_3, flash_provider_4]
flash_provider_list_length = len(flash_provider_list)

def get_flash_loan(token, expected_amount, token):
    borrowed_amount = 0
    provider_index = 0

    # Go through each flash loan provider's reserves and borrow until required amount 
    # has been accumulated.
    while borrowed_amount < expected_amount:

        # Borrow max possible amount of given token from this flash loan provider
        borrowed_amount += flash_borrow_max(flash_provider_list[provider_index], token )
        provider_index+=1

        # Exit when we have run out of flash loan providers; Pass on what we got.
        if provider_index > flash_provider_list_length:
            break
    
    pass_on_borrowed_tokens_to_caller_smart_contract()

```

# Getting a unique id for your program

run `anchor test` first. This will generate a key pair for you. Then run:
```
solana address -k target/deploy/flashaggregator-keypair.json 

# BnN9NvW3EBScQpxvVa6yVBSjWhiu7XamZbLPVuyY9WnQ
```

Now in `programs/flashaggregator/src/lib.rs` and `Anchor.toml` change `your-program-id` to the address you got in the previous step.
```
// programs/flashaggregator/src/lib.rs

declare_id!("your-program-id");
```

```
# Anchor.toml

[programs.devnet]
flashaggregator = "your-program-id"
```
# Airdropping Sol

```
solana airdrop 1 8vbPKLTCWxR9wiPMhyDkUQMMGnmeCxPXtpxvLALbQN5m --url https://api.devnet.solana.com
```

# Running tests


Run integration tests directly on devnet, in order to interact with the existing on chain programs.

```bash
anchor test
```

Run unittests

```bash
cargo test
```


### Useful debugging tools

Find program data length
```shell

solana program show GT2jZnYzjMkv4uufjPHpRStKmQKQEt5oJYHmCAcFXb4M

# Program Id: GT2jZnYzjMkv4uufjPHpRStKmQKQEt5oJYHmCAcFXb4M
# Owner: BPFLoaderUpgradeab1e11111111111111111111111
# ProgramData Address: 6VxqZdhHGQqs8eBEjdCgc4H8M4HUQxWtdSHcnt1HMa65
# Authority: 711gc5iRvrUCjd17VeDdJkcqm7wbe71fMfNGRNCWFukt
# Last Deployed In Slot: 95293605
# Data Length: 437280 (0x6ac20) bytes
# Balance: 3.04467288 SOL
```

Calculate rent
```shell

solana rent 437280

# Rent per byte-year: 0.00000348 SOL
# Rent per epoch: 0.00833518 SOL
# Rent-exempt minimum: 3.04435968 SOL

```


Do a dump of the elf file
```shell
cargo build-bpf --dump
```
