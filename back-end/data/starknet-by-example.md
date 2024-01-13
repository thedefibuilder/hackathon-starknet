# Calling other contracts
There are two different ways to call other contracts in Cairo. The easiest way to call other contracts is by using the
dispatcher of the contract you want to call. The other way is to use the `starknet::call_contract_syscall` syscall
yourself. However, this method is not recommended. In order to call other contracts using dispatchers, you will need to
define the called contract's interface as a trait annotated with the `#[starknet::interface]` attribute, and then import
the `IContractDispatcher` and `IContractDispatcherTrait` items in your contract.
```rust
#[starknet::interface]
trait ICallee<TContractState> {
    fn set_value(ref self: TContractState, value: u128) -> u128;
}
#[starknet::contract]
mod Callee {
    #[storage]
    struct Storage {
        value: u128,
    }
    #[abi(embed_v0)]
    impl ICalleeImpl of super::ICallee<ContractState> {
        fn set_value(ref self: ContractState, value: u128) -> u128 {
            self.value.write(value);
            value
        }
    }
}
```
```rust
use starknet::ContractAddress;
// We need to have the interface of the callee contract defined
// so that we can import the Dispatcher.
#[starknet::interface]
trait ICallee<TContractState> {
    fn set_value(ref self: TContractState, value: u128) -> u128;
}
#[starknet::interface]
trait ICaller<TContractState> {
    fn set_value_from_address(ref self: TContractState, addr: ContractAddress, value: u128);
}
#[starknet::contract]
mod Caller {
    // We import the Dispatcher of the called contract
    use super::{ICalleeDispatcher, ICalleeDispatcherTrait};
    use starknet::ContractAddress;
    #[storage]
    struct Storage {}
    #[abi(embed_v0)]
    impl ICallerImpl of super::ICaller<ContractState> {
        fn set_value_from_address(ref self: ContractState, addr: ContractAddress, value: u128) {
            ICalleeDispatcher { contract_address: addr }.set_value(value);
        }
    }
}
```
# Mappings
Maps are a key-value data structure used to store data within a smart contract. In Cairo they are implemented using the
`LegacyMap` type. It's important to note that the `LegacyMap` type can only be used inside the `Storage` struct of a
contract and that it can't be used elsewhere. Here we demonstrate how to use the `LegacyMap` type within a Cairo
contract, to map between a key of type `ContractAddress` and value of type `felt252`. The key-value types are specified
within angular brackets <>. We write to the map by calling the `write()` method, passing in both the key and value.
Similarly, we can read the value associated with a given key by calling the `read()` method and passing in the relevant
key. Some additional notes:
- More complex key-value mappings are possible, for example we could use
  `LegacyMap::<(ContractAddress, ContractAddress), felt252>` to create an allowance on an ERC20 token contract.
- In mappings, the address of the value at key `k_1,...,k_n` is `h(...h(h(sn_keccak(variable_name),k_1),k_2),...,k_n)`
  where `ℎ` is the Pedersen hash and the final value is taken `mod2251−256`.
```rust
use starknet::ContractAddress;
#[starknet::interface]
trait IMapContract<TContractState> {
    fn set(ref self: TContractState, key: ContractAddress, value: felt252);
    fn get(self: @TContractState, key: ContractAddress) -> felt252;
}
#[starknet::contract]
mod MapContract {
    use starknet::ContractAddress;
    #[storage]
    struct Storage {
        // The `LegacyMap` type is only available inside the `Storage` struct.
        map: LegacyMap::<ContractAddress, felt252>,
    }
    #[abi(embed_v0)]
    impl MapContractImpl of super::IMapContract<ContractState> {
        fn set(ref self: ContractState, key: ContractAddress, value: felt252) {
            self.map.write(key, value);
        }
        fn get(self: @ContractState, key: ContractAddress) -> felt252 {
            self.map.read(key)
        }
    }
}
```
# Events
Events are a way to emit data from a contract. All events must be defined in the `Event` enum, which must be annotated
with the `#[event]` attribute. An event is defined as struct that derives the `#[starknet::Event]` trait. The fields of
that struct correspond to the data that will be emitted. An event can be indexed for easy and fast access when querying
the data at a later time. Events data can be indexed by adding a `#[key]` attribute to a field member. Here's a simple
example of a contract using events that emit an event each time a counter is incremented by the "increment" function:
```rust
#[starknet::interface]
trait IEventCounter<TContractState> {
    fn increment(ref self: TContractState);
}
#[starknet::contract]
mod EventCounter {
    use starknet::{get_caller_address, ContractAddress};
    #[storage]
    struct Storage {
        // Counter value
        counter: u128,
    }
    #[event]
    #[derive(Drop, starknet::Event)]
    // The event enum must be annotated with the `#[event]` attribute.
    // It must also derive the `Drop` and `starknet::Event` traits.
    enum Event {
        CounterIncreased: CounterIncreased,
        UserIncreaseCounter: UserIncreaseCounter
    }
    // By deriving the `starknet::Event` trait, we indicate to the compiler that
    // this struct will be used when emitting events.
    #[derive(Drop, starknet::Event)]
    struct CounterIncreased {
        amount: u128
    }
    #[derive(Drop, starknet::Event)]
    struct UserIncreaseCounter {
        // The `#[key]` attribute indicates that this event will be indexed.
        #[key]
        user: ContractAddress,
        new_value: u128,
    }
    #[abi(embed_v0)]
    impl EventCounter of super::IEventCounter<ContractState> {
        fn increment(ref self: ContractState) {
            let mut counter = self.counter.read();
            counter += 1;
            self.counter.write(counter);
            // Emit event
            self.emit(Event::CounterIncreased(CounterIncreased { amount: 1 }));
            self
                .emit(
                    Event::UserIncreaseCounter(
                        UserIncreaseCounter {
                            user: get_caller_address(), new_value: self.counter.read()
                        }
                    )
                );
        }
    }
}
```
# Loop
A loop specifies a block of code that will run repetitively until a halting condition is encountered. For example:
```rust
fn do_loop() {
    let mut arr = ArrayTrait::new();
    // Same as ~ while (i < 10) arr.append(i++);
    let mut i: u32 = 0;
    let limit = 10;
    loop {
        if i == limit {
            break;
        };
        arr.append(i);
        i += 1;
    };
}
```
# Writing to any storage slot
On Starknet, a contract's storage is a map with 2^251 slots, where each slot is a felt which is initialized to 0. The
address of storage variables is computed at compile time using the formula:
`storage variable address := pedersen(keccak(variable name), keys)`. Interactions with storage variables are commonly
performed using the `self.var.read()` and `self.var.write()` functions. Nevertheless, we can use the
`storage_write_syscall` and `storage_read_syscall` syscalls, to write to and read from any storage slot. This is useful
when writing to storage variables that are not known at compile time, or to ensure that even if the contract is upgraded
and the computation method of storage variable addresses changes, they remain accessible. In the following example, we
use the Poseidon hash function to compute the address of a storage variable. Poseidon is a ZK-friendly hash function
that is cheaper and faster than Pedersen, making it an excellent choice for onchain computations. Once the address is
computed, we use the storage syscalls to interact with it.
```rust
#[starknet::interface]
trait IWriteToAnySlots<TContractState> {
    fn write_slot(ref self: TContractState, value: u32);
    fn read_slot(self: @TContractState) -> u32;
}
#[starknet::contract]
mod WriteToAnySlot {
    use starknet::syscalls::{storage_read_syscall, storage_write_syscall};
    use starknet::SyscallResultTrait;
    use poseidon::poseidon_hash_span;
    use starknet::storage_access::Felt252TryIntoStorageAddress;
    use starknet::StorageAddress;
    #[storage]
    struct Storage {}
    const SLOT_NAME: felt252 = 'test_slot';
    #[abi(embed_v0)]
    impl WriteToAnySlot of super::IWriteToAnySlots<ContractState> {
        fn write_slot(ref self: ContractState, value: u32) {
            storage_write_syscall(0, get_address_from_name(SLOT_NAME), value.into());
        }
        fn read_slot(self: @ContractState) -> u32 {
            storage_read_syscall(0, get_address_from_name(SLOT_NAME))
                .unwrap_syscall()
                .try_into()
                .unwrap()
        }
    }
    fn get_address_from_name(variable_name: felt252) -> StorageAddress {
        let mut data: Array<felt252> = ArrayTrait::new();
        data.append(variable_name);
        let hashed_name: felt252 = poseidon_hash_span(data.span());
        let MASK_250: u256 = 0x03ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff;
        // By taking the 250 least significant bits of the hash output, we get a valid 250bits storage address.
        let result: felt252 = (hashed_name.into() & MASK_250).try_into().unwrap();
        let result: StorageAddress = result.try_into().unwrap();
        result
    }
}
```
# Variables
There are 3 types of variables in Cairo contracts:
- Local
  - declared inside a function
  - not stored on the blockchain
- Storage
  - declared in the [Storage](./storage.md) of a contract
  - can be accessed from one execution to another
- Global
  - provides information about the blockchain
  - accessed anywhere, even within library functions
## Local Variables
Local variables are used and accessed within the scope of a specific function or block of code. They are temporary and
exist only for the duration of that particular function or block execution. Local variables are stored in memory and are
not stored on the blockchain. This means they cannot be accessed from one execution to another. Local variables are
useful for storing temporary data that is relevant only within a specific context. They also make the code more readable
by giving names to intermediate values. Here's a simple example of a contract with only local variables:
```rust
#[starknet::interface]
trait ILocalVariablesExample<TContractState> {
    fn do_something(self: @TContractState, value: u32) -> u32;
}
#[starknet::contract]
mod LocalVariablesExample {
    #[storage]
    struct Storage {}
    #[abi(embed_v0)]
    impl LocalVariablesExample of super::ILocalVariablesExample<ContractState> {
        fn do_something(self: @ContractState, value: u32) -> u32 {
            // This variable is local to the current block. It can't be accessed once it goes out of scope.
            let increment = 10;
            {
                // The scope of a code block allows for local variable declaration
                // We can access variables defined in higher scopes.
                let sum = value + increment;
                sum
            }
        }
    }
}
```
## Storage Variables
Storage variables are persistent data stored on the blockchain. They can be accessed from one execution to another,
allowing the contract to remember and update information over time. To write or update a storage variable, you need to
interact with the contract through an external entrypoint by sending a transaction. On the other hand, you can read
state variables, for free, without any transaction, simply by interacting with a node. Here's a simple example of a
contract with one storage variable:
```rust
#[starknet::interface]
trait IStorageVariableExample<TContractState> {
    fn set(ref self: TContractState, value: u32);
    fn get(self: @TContractState) -> u32;
}
#[starknet::contract]
mod StorageVariablesExample {
    // All storage variables are contained in a struct called Storage
    // annotated with the `#[storage]` attribute
    #[storage]
    struct Storage {
        // Storage variable holding a number
        value: u32
    }
    #[abi(embed_v0)]
    impl StorageVariablesExample of super::IStorageVariableExample<ContractState> {
        // Write to storage variables by sending a transaction that calls an external function
        fn set(ref self: ContractState, value: u32) {
            self.value.write(value);
        }
        // Read from storage variables without sending transactions
        fn get(self: @ContractState) -> u32 {
            self.value.read()
        }
    }
}
```
## Global Variables
Global variables are predefined variables that provide information about the blockchain and the current execution
environment. They can be accessed at any time and from anywhere! In Starknet, you can access global variables by using
specific functions contained in the starknet core libraries. For example, the `get_caller_address` function returns the
address of the caller of the current transaction, and the `get_contract_address` function returns the address of the
current contract.
```rust
#[starknet::interface]
trait IGlobalExample<TContractState> {
    fn foo(ref self: TContractState);
}
#[starknet::contract]
mod GlobalExample {
    // import the required functions from the starknet core library
    use starknet::get_caller_address;
    #[storage]
    struct Storage {}
    #[abi(embed_v0)]
    impl GlobalExampleImpl of super::IGlobalExample<ContractState> {
        fn foo(ref self: ContractState) {
            // Call the get_caller_address function to get the sender address
            let caller = get_caller_address();
        // ...
        }
    }
}
```
# Ownable
The following `Ownable` component is a simple component that allows the contract to set an owner and provides a
`_assert_is_owner` function that can be used to ensure that the caller is the owner. It can also be used to renounce
ownership of a contract, meaning that no one will be able to satisfy the `_assert_is_owner` function.
```rust
use starknet::ContractAddress;
#[starknet::interface]
trait IOwnable<TContractState> {
    fn owner(self: @TContractState) -> ContractAddress;
    fn transfer_ownership(ref self: TContractState, new: ContractAddress);
    fn renounce_ownership(ref self: TContractState);
}
mod Errors {
    const UNAUTHORIZED: felt252 = 'Not owner';
    const ZERO_ADDRESS_OWNER: felt252 = 'Owner cannot be zero';
    const ZERO_ADDRESS_CALLER: felt252 = 'Caller cannot be zero';
}
#[starknet::component]
mod ownable_component {
    use starknet::{ContractAddress, get_caller_address};
    use super::Errors;
    #[storage]
    struct Storage {
        ownable_owner: ContractAddress,
    }
    #[derive(Drop, starknet::Event)]
    struct OwnershipTransferredEvent {
        previous: ContractAddress,
        new: ContractAddress
    }
    #[derive(Drop, starknet::Event)]
    struct OwnershipRenouncedEvent {
        previous: ContractAddress
    }
    #[event]
    #[derive(Drop, starknet::Event)]
    enum Event {
        OwnershipTransferredEvent: OwnershipTransferredEvent,
        OwnershipRenouncedEvent: OwnershipRenouncedEvent
    }
    #[embeddable_as(Ownable)]
    impl OwnableImpl<
        TContractState, +HasComponent<TContractState>
    > of super::IOwnable<ComponentState<TContractState>> {
        fn owner(self: @ComponentState<TContractState>) -> ContractAddress {
            self.ownable_owner.read()
        }
        fn transfer_ownership(ref self: ComponentState<TContractState>, new: ContractAddress) {
            self._assert_only_owner();
            self._transfer_ownership(new);
        }
        fn renounce_ownership(ref self: ComponentState<TContractState>) {
            self._assert_only_owner();
            self._renounce_ownership();
        }
    }
    #[generate_trait]
    impl OwnableInternalImpl<
        TContractState, +HasComponent<TContractState>
    > of OwnableInternalTrait<TContractState> {
        fn _assert_only_owner(self: @ComponentState<TContractState>) {
            let caller = get_caller_address();
            assert(!caller.is_zero(), Errors::ZERO_ADDRESS_CALLER);
            assert(caller == self.ownable_owner.read(), Errors::UNAUTHORIZED);
        }
        fn _init(ref self: ComponentState<TContractState>, owner: ContractAddress) {
            assert(!owner.is_zero(), Errors::ZERO_ADDRESS_OWNER);
            self.ownable_owner.write(owner);
        }
        fn _transfer_ownership(ref self: ComponentState<TContractState>, new: ContractAddress) {
            assert(!new.is_zero(), Errors::ZERO_ADDRESS_OWNER);
            let previous = self.ownable_owner.read();
            self.ownable_owner.write(new);
            self
                .emit(
                    Event::OwnershipTransferredEvent(OwnershipTransferredEvent { previous, new })
                );
        }
        fn _renounce_ownership(ref self: ComponentState<TContractState>) {
            let previous = self.ownable_owner.read();
            self.ownable_owner.write(Zeroable::zero());
            self.emit(Event::OwnershipRenouncedEvent(OwnershipRenouncedEvent { previous }));
        }
    }
}
```
A mock contract that uses the `Ownable` component:
```rust
#[starknet::interface]
trait IOwned<TContractState> {
    fn do_something(ref self: TContractState);
}
#[starknet::contract]
mod OwnedContract {
    use components::ownable::IOwnable;
    use components::ownable::ownable_component::OwnableInternalTrait;
    use components::ownable::ownable_component;
    component!(path: ownable_component, storage: ownable, event: OwnableEvent);
    #[abi(embed_v0)]
    impl OwnableImpl = ownable_component::Ownable<ContractState>;
    impl OwnableInternalImpl = ownable_component::OwnableInternalImpl<ContractState>;
    #[storage]
    struct Storage {
        #[substorage(v0)]
        ownable: ownable_component::Storage,
    }
    #[constructor]
    fn constructor(ref self: ContractState) {
        self.ownable._init(starknet::get_caller_address());
    }
    #[event]
    #[derive(Drop, starknet::Event)]
    enum Event {
        OwnableEvent: ownable_component::Event,
    }
    #[external(v0)]
    impl Owned of super::IOwned<ContractState> {
        fn do_something(ref self: ContractState) {
            self.ownable._assert_only_owner();
        // ...
        }
    }
}
```
# Arrays
Arrays are collections of elements of the same type. The possible operations on arrays are defined with the
`array::ArrayTrait` of the corelib:
```rust
trait ArrayTrait<T> {
fn new() -> Array<T>;
fn append(ref self: Array<T>, value: T);
fn pop_front(ref self: Array<T>) -> Option<T> nopanic;
fn pop_front_consume(self: Array<T>) -> Option<(Array<T>, T)> nopanic;
fn get(self: @Array<T>, index: usize) -> Option<Box<@T>>;
fn at(self: @Array<T>, index: usize) -> @T;
fn len(self: @Array<T>) -> usize;
fn is_empty(self: @Array<T>) -> bool;
fn span(self: @Array<T>) -> Span<T>;
}
```
For example:
```rust
fn array() -> bool {
    let mut arr = ArrayTrait::<u32>::new();
    arr.append(10);
    arr.append(20);
    arr.append(30);
    assert(arr.len() == 3, 'array length should be 3');
    let first_value = arr.pop_front().unwrap();
    assert(first_value == 10, 'first value should match');
    let second_value = *arr.at(0);
    assert(second_value == 20, 'second value should match');
    // Returns true if an array is empty, then false if it isn't.
    arr.is_empty()
}
```
# Hashing
Hashing is a cryptographic technique that allows you to transform a variable length input into a fixed length output.
The resulting output is called a hash and it's completely different from the input. Hash functions are deterministic,
meaning that the same input will always produce the same output. The two hash functions provided by the Cairo library
are `Poseidon` and `Pedersen`. Pedersen hashes were used in the past (but still used in some scenario for backward
compatibility) while Poseidon hashes are the standard nowadays since they were designed to be very efficient for Zero
Knowledge proof systems. In Cairo it's possible to hash all the types that can be converted to `felt252` since they
implement natively the `Hash` trait. It's also possible to hash more complex types like structs by deriving the Hash
trait with the attribute `#[derive(Hash)]` but only if all the struct's fields are themselves hashable. You first need
to initialize a hash state with the `new` method of the `HashStateTrait` and then you can update it with the `update`
method. You can accumulate multiple updates. Then, the `finalize` method returns the final hash value as a `felt252`.
```rust
#[starknet::interface]
trait IHashTrait<T> {
    fn save_user_with_poseidon(
        ref self: T, id: felt252, username: felt252, password: felt252
    ) -> felt252;
    fn save_user_with_pedersen(
        ref self: T, id: felt252, username: felt252, password: felt252
    ) -> felt252;
}
#[starknet::contract]
mod HashTraits {
    use core::hash::{HashStateTrait, HashStateExTrait};
    use core::{pedersen::PedersenTrait, poseidon::PoseidonTrait};
    #[storage]
    struct Storage {
        user_hash_poseidon: felt252,
        user_hash_pedersen: felt252,
    }
    #[derive(Drop, Hash)]
    struct LoginDetails {
        username: felt252,
        password: felt252,
    }
    #[derive(Drop, Hash)]
    struct UserDetails {
        id: felt252,
        login: LoginDetails,
    }
    #[abi(embed_v0)]
    impl HashTrait of super::IHashTrait<ContractState> {
        fn save_user_with_poseidon(
            ref self: ContractState, id: felt252, username: felt252, password: felt252
        ) -> felt252 {
            let login = LoginDetails { username, password };
            let user = UserDetails { id, login };
            let poseidon_hash = PoseidonTrait::new().update_with(user).finalize();
            self.user_hash_poseidon.write(poseidon_hash);
            poseidon_hash
        }
        fn save_user_with_pedersen(
            ref self: ContractState, id: felt252, username: felt252, password: felt252
        ) -> felt252 {
            let login = LoginDetails { username, password };
            let user = UserDetails { id, login };
            let pedersen_hash = PedersenTrait::new(0).update_with(user).finalize();
            self.user_hash_pedersen.write(pedersen_hash);
            pedersen_hash
        }
    }
}
```
# Storing Custom Types
While native types can be stored in a contract's storage without any additional work, custom types require a bit more
work. This is because at compile time, the compiler does not know how to store custom types in storage. To solve this,
we need to implement the `Store` trait for our custom type. Hopefully, we can just derive this trait for our custom
type - unless it contains arrays or dictionaries.
```rust
#[starknet::interface]
trait IStoringCustomType<TContractState> {
    fn set_person(ref self: TContractState, person: Person);
}
// Deriving the starknet::Store trait
// allows us to store the `Person` struct in the contract's storage.
#[derive(Drop, Serde, Copy, starknet::Store)]
struct Person {
    age: u8,
    name: felt252
}
#[starknet::contract]
mod StoringCustomType {
    use super::Person;
    #[storage]
    struct Storage {
        person: Person
    }
    #[abi(embed_v0)]
    impl StoringCustomType of super::IStoringCustomType<ContractState> {
        fn set_person(ref self: ContractState, person: Person) {
            self.person.write(person);
        }
    }
}
```
# Match
The "match" expression in Cairo allows us to control the flow of our code by comparing a felt data type or an enum
against various patterns and then running specific code based on the pattern that matches. For example:
```rust
#[derive(Drop, Serde)]
enum Colour {
    Red,
    Blue,
    Green,
    Orange,
    Black
}
#[derive(Drop, Serde)]
enum Coin {
    Penny,
    Nickel,
    Dime,
    Quarter,
}
fn value_in_cents(coin: Coin) -> felt252 {
    match coin {
        Coin::Penny => 1,
        Coin::Nickel => 5,
        Coin::Dime => 10,
        Coin::Quarter => 25,
    }
}
fn specified_colour(colour: Colour) -> felt252 {
    let mut response: felt252 = '';
    match colour {
        Colour::Red => { response = 'You passed in Red'; },
        Colour::Blue => { response = 'You passed in Blue'; },
        Colour::Green => { response = 'You passed in Green'; },
        Colour::Orange => { response = 'You passed in Orange'; },
        Colour::Black => { response = 'You passed in Black'; },
    };
    response
}
fn quiz(num: felt252) -> felt252 {
    let mut response: felt252 = '';
    match num {
        0 => { response = 'You failed' },
        _ => { response = 'You Passed' },
    };
    response
}
```
# Storage
Storage is a struct annoted with `#[storage]`. Every contract must have one and only one storage. It's a key-value
store, where each key will be mapped to a storage address of the contract's storage space. You can define storage
variables in your contract, and then use them to store and retrieve data.
```rust
#[starknet::contract]
mod Contract {
    #[storage]
    struct Storage {
        a: u128,
        b: u8,
        c: u256
    }
}
```
> Actually these two contracts have the same underlying sierra program. From the compiler's perspective, the storage
> variables don't exist until they are used.
# Contract interfaces and Traits generation
Contract interfaces define the structure and behavior of a contract, serving as the contract's public ABI. They list all
the function signatures that a contract exposes. For a detailed explanation of interfaces, you can refer to the [Cairo
Book]. In cairo, to specify the interface you need to define a trait annotated with `#[starknet::interface]` and then
implement that trait in the contract. When a function needs to access the contract state, it must have a `self`
parameter of type `ContractState`. This implies that the corresponding function signature in the interface trait must
also take a `TContractState` type as a parameter. It's important to note that every function in the contract interface
must have this `self` parameter of type `TContractState`. You can use the `#[generate_trait]` attribute to implicitly
generate the trait for a specific implementation block. This attribute automatically generates a trait with the same
functions as the ones in the implemented block, replacing the `self` parameter with a generic `TContractState`
parameter. However, you will need to annotate the block with the `#[abi(per_item)]` attribute, and each function with
the appropriate attribute depending on whether it's an external function, a constructor or a l1 handler. In summary,
there's two ways to handle interfaces:
- Explicitly, by defining a trait annoted with `#[starknet::interface]`
- Implicitly, by using `#[generate_trait]` combined with the #[abi(per_item)]` attributes, and annotating each function
  inside the implementation block with the appropriate attribute.
## Explicit interface
````rust
#[starknet::interface]
trait IExplicitInterfaceContract<TContractState> {
    fn get_value(self: @TContractState) -> u32;
    fn set_value(ref self: TContractState, value: u32);
}
#[starknet::contract]
mod ExplicitInterfaceContract {
    #[storage]
    struct Storage {
        value: u32
    }
    #[abi(embed_v0)]
    impl ExplicitInterfaceContract of super::IExplicitInterfaceContract<ContractState> {
        fn get_value(self: @ContractState) -> u32 {
            self.value.read()
        }
        fn set_value(ref self: ContractState, value: u32) {
            self.value.write(value);
        }
    }
}
```
## Implicit interface
```rust
#[starknet::contract]
mod ImplicitInterfaceContract {
    #[storage]
    struct Storage {
        value: u32
    }
    #[abi(per_item)]
    #[generate_trait]
    impl ImplicitInterfaceContract of IImplicitInterfaceContract {
        #[external(v0)]
        fn get_value(self: @ContractState) -> u32 {
            self.value.read()
        }
        #[external(v0)]
        fn set_value(ref self: ContractState, value: u32) {
            self.value.write(value);
        }
    }
}
````
> Note: You can import an implicitly generated contract interface with `use contract::{GeneratedContractInterface}`.
> However, the `Dispatcher` will not be generated automatically.
## Internal functions
You can also use `#[generate_trait]` for your internal functions. Since this trait is generated in the context of the
contract, you can define pure functions as well (functions without the `self` parameter).
```rust
#[starknet::interface]
trait IImplicitInternalContract<TContractState> {
    fn add(ref self: TContractState, nb: u32);
    fn get_value(self: @TContractState) -> u32;
    fn get_const(self: @TContractState) -> u32;
}
#[starknet::contract]
mod ImplicitInternalContract {
    #[storage]
    struct Storage {
        value: u32
    }
    #[generate_trait]
    impl InternalFunctions of InternalFunctionsTrait {
        fn set_value(ref self: ContractState, value: u32) {
            self.value.write(value);
        }
        fn get_const() -> u32 {
            42
        }
    }
    #[constructor]
    fn constructor(ref self: ContractState) {
        self.set_value(0);
    }
    #[abi(embed_v0)]
    impl ImplicitInternalContract of super::IImplicitInternalContract<ContractState> {
        fn add(ref self: ContractState, nb: u32) {
            self.set_value(self.value.read() + nb);
        }
        fn get_value(self: @ContractState) -> u32 {
            self.value.read()
        }
        fn get_const(self: @ContractState) -> u32 {
            self.get_const()
        }
    }
}
```
# Custom types in entrypoints
Using custom types in entrypoints requires our type to implement the `Serde` trait. This is because when calling an
entrypoint, the input is sent as an array of `felt252` to the entrypoint, and we need to be able to deserialize it into
our custom type. Similarly, when returning a custom type from an entrypoint, we need to be able to serialize it into an
array of `felt252`. Thankfully, we can just derive the `Serde` trait for our custom type.
```rust
#[starknet::interface]
trait ISerdeCustomType<TContractState> {
    fn person_input(ref self: TContractState, person: SerdeCustomType::Person);
    fn person_output(self: @TContractState) -> SerdeCustomType::Person;
}
#[starknet::contract]
mod SerdeCustomType {
    #[storage]
    struct Storage {}
    // Deriving the `Serde` trait allows us to use
    // the Person type as an entrypoint parameter and return value
    #[derive(Drop, Serde)]
    struct Person {
        age: u8,
        name: felt252
    }
    #[abi(embed_v0)]
    impl SerdeCustomType of super::ISerdeCustomType<ContractState> {
        fn person_input(ref self: ContractState, person: Person) {}
        fn person_output(self: @ContractState) -> Person {
            Person { age: 10, name: 'Joe' }
        }
    }
}
```
# Syscalls
At the protocol level, the Starknet Operating System (OS) is the program that manages the whole Starknet network. Some
of the OS functionalities are exposed to smart contracts through the use of syscalls (system calls). Syscalls can be
used to get information about the state of the Starknet network, to interact with/deploy contracts, emit events, send
messages, and perform other low-level operations. Syscalls return a `SyscallResult` which is either `Sucess` of
`Failure`, allowing the contract to handle errors. Here's the available syscalls:
- [get_block_hash]
- [get_execution_info]
- [call_contract]
- [deploy]
- [emit_event]
- [library_call]
- [send_message_to_L1]
- [replace_class]
- [storage_read]
- [storage_write]
#### get_block_hash
```rust
fn get_block_hash_syscall(block_number: u64) -> SyscallResult<felt252>
```
Get the hash of the block number `block_number`. Only within the range `[first_v0_12_0_block, current_block - 10]`.
#### get_execution_info
```rust
fn get_execution_info_syscall() -> SyscallResult<Box<starknet::info::ExecutionInfo>>
```
Get information about the current execution context. The returned `ExecutionInfo` is defined as :
```rust
#[derive(Copy, Drop, Debug)]
pub struct ExecutionInfo {
pub block_info: Box<BlockInfo>,
pub tx_info: Box<TxInfo>,
pub caller_address: ContractAddress,
pub contract_address: ContractAddress,
pub entry_point_selector: felt252,
}
#[derive(Copy, Drop, Debug, Serde)]
pub struct BlockInfo {
pub block_number: u64,
pub block_timestamp: u64,
pub sequencer_address: ContractAddress,
}
#[derive(Copy, Drop, Debug, Serde)]
pub struct TxInfo {
// The version of the transaction. Always fixed (1)
pub version: felt252,
// The account contract from which this transaction originates.
pub account_contract_address: ContractAddress,
// The max_fee field of the transaction.
pub max_fee: u128,
// The signature of the transaction.
pub signature: Span<felt252>,
// The hash of the transaction.
pub transaction_hash: felt252,
// The identifier of the chain.
// This field can be used to prevent replay of testnet transactions on mainnet.
pub chain_id: felt252,
// The transaction's nonce.
pub nonce: felt252,
// A span of ResourceBounds structs.
pub resource_bounds: Span<ResourceBounds>,
// The tip.
pub tip: u128,
// If specified, the paymaster should pay for the execution of the tx.
// The data includes the address of the paymaster sponsoring the transaction, followed by
// extra data to send to the paymaster.
pub paymaster_data: Span<felt252>,
// The data availability mode for the nonce.
pub nonce_data_availability_mode: u32,
// The data availability mode for the account balance from which fee will be taken.
pub fee_data_availability_mode: u32,
// If nonempty, will contain the required data for deploying and initializing an account
// contract: its class hash, address salt and constructor calldata.
pub account_deployment_data: Span<felt252>,
}
```
`starknet::info` provides helper functions to access the `ExecutionInfo` fields in a more convenient way:
- `get_execution_info() -> Box<ExecutionInfo>`
- `get_caller_address() -> ContractAddress`
- `get_contract_address() -> ContractAddress`
- `get_block_info() -> Box<BlockInfo>`
- `get_tx_info() -> Box<TxInfo>`
- `get_block_timestamp() -> u64`
- `get_block_number() -> u64`
#### call_contract
```rust
fn call_contract_syscall(
    address: ContractAddress, entry_point_selector: felt252, calldata: Span<felt252>
) -> SyscallResult<Span<felt252>>
```
Call a contract at `address` with the given `entry_point_selector` and `calldata`. Failure can't be caught for this
syscall, if the call fails, the whole transaction will revert. This is not the recommended way to call a contract.
Instead, use the dispatcher generated from the contract interface.
#### deploy
```rust
fn deploy_syscall(
class_hash: ClassHash,
contract_address_salt: felt252,
calldata: Span<felt252>,
deploy_from_zero: bool,
) -> SyscallResult<(ContractAddress, Span::<felt252>)>
```
Deploy a new contract of the predeclared class `class_hash` with `calldata`. The success result is a tuple containing
the deployed contract address and the return value of the constructor. `contract_address_salt` and `deploy_from_zero`
are used to compute the contract address.
```rust
use starknet::{ContractAddress, ClassHash};
#[starknet::interface]
trait ICounterFactory<TContractState> {
    /// Create a new counter contract from stored arguments
    fn create_counter(ref self: TContractState) -> ContractAddress;
    /// Create a new counter contract from the given arguments
    fn create_counter_at(ref self: TContractState, init_value: u128) -> ContractAddress;
    /// Update the argument
    fn update_init_value(ref self: TContractState, init_value: u128);
    /// Update the class hash of the Counter contract to deploy when creating a new counter
    fn update_counter_class_hash(ref self: TContractState, counter_class_hash: ClassHash);
}
#[starknet::contract]
mod CounterFactory {
    use starknet::{ContractAddress, ClassHash};
    use starknet::syscalls::deploy_syscall;
    #[storage]
    struct Storage {
        /// Store the constructor arguments of the contract to deploy
        init_value: u128,
        /// Store the class hash of the contract to deploy
        counter_class_hash: ClassHash,
    }
    #[constructor]
    fn constructor(ref self: ContractState, init_value: u128, class_hash: ClassHash) {
        self.init_value.write(init_value);
        self.counter_class_hash.write(class_hash);
    }
    #[abi(embed_v0)]
    impl Factory of super::ICounterFactory<ContractState> {
        fn create_counter_at(ref self: ContractState, init_value: u128) -> ContractAddress {
            // Contructor arguments
            let mut constructor_calldata: Array::<felt252> = array![init_value.into()];
            // Contract deployment
            let (deployed_address, _) = deploy_syscall(
                self.counter_class_hash.read(), 0, constructor_calldata.span(), false
            )
                .expect('failed to deploy counter');
            deployed_address
        }
        fn create_counter(ref self: ContractState) -> ContractAddress {
            self.create_counter_at(self.init_value.read())
        }
        fn update_init_value(ref self: ContractState, init_value: u128) {
            self.init_value.write(init_value);
        }
        fn update_counter_class_hash(ref self: ContractState, counter_class_hash: ClassHash) {
            self.counter_class_hash.write(counter_class_hash);
        }
    }
}
```
#### emit_event
```rust
fn emit_event_syscall(
keys: Span<felt252>, data: Span<felt252>
) -> SyscallResult<()>
```
Emit an event with the given `keys` and `data`. Example of the usage of the `emit_event` syscall from the Events
chapter:
```rust
#[starknet::interface]
trait IEventCounter<TContractState> {
    fn increment(ref self: TContractState);
}
#[starknet::contract]
mod EventCounter {
    use starknet::{get_caller_address, ContractAddress};
    #[storage]
    struct Storage {
        // Counter value
        counter: u128,
    }
    #[event]
    #[derive(Drop, starknet::Event)]
    // The event enum must be annotated with the `#[event]` attribute.
    // It must also derive the `Drop` and `starknet::Event` traits.
    enum Event {
        CounterIncreased: CounterIncreased,
        UserIncreaseCounter: UserIncreaseCounter
    }
    // By deriving the `starknet::Event` trait, we indicate to the compiler that
    // this struct will be used when emitting events.
    #[derive(Drop, starknet::Event)]
    struct CounterIncreased {
        amount: u128
    }
    #[derive(Drop, starknet::Event)]
    struct UserIncreaseCounter {
        // The `#[key]` attribute indicates that this event will be indexed.
        #[key]
        user: ContractAddress,
        new_value: u128,
    }
    #[abi(embed_v0)]
    impl EventCounter of super::IEventCounter<ContractState> {
        fn increment(ref self: ContractState) {
            let mut counter = self.counter.read();
            counter += 1;
            self.counter.write(counter);
            // Emit event
            self.emit(Event::CounterIncreased(CounterIncreased { amount: 1 }));
            self
                .emit(
                    Event::UserIncreaseCounter(
                        UserIncreaseCounter {
                            user: get_caller_address(), new_value: self.counter.read()
                        }
                    )
                );
        }
    }
}
```
#### library_call
```rust
fn library_call_syscall(
class_hash: ClassHash, function_selector: felt252, calldata: Span<felt252>
) -> SyscallResult<Span<felt252>>
```
Call the function `function_selector` of the class `class_hash` with `calldata`. This is analogous to a delegate call in
Ethereum, but only a single class is called.
#### send_message_to_L1
```rust
fn send_message_to_l1_syscall(
    to_address: felt252, payload: Span<felt252>
) -> SyscallResult<()>
```
Send a message to the L1 contract at `to_address` with the given `payload`.
#### replace_class
```rust
fn replace_class_syscall(
class_hash: ClassHash
) -> SyscallResult<()>
```
#### storage_read
```rust
fn storage_read_syscall(
address_domain: u32, address: StorageAddress,
) -> SyscallResult<felt252>
```
This low-level syscall is used to get the value in the storage of a specific key at `address` in the `address_domain`.
`address_domain` is used to distinguish between data availability modes. Currently, only mode `ONCHAIN` (`0`) is
supported.
#### storage_write
```rust
fn storage_write_syscall(
    address_domain: u32, address: StorageAddress, value: felt252
) -> SyscallResult<()>
```
Similar to `storage_read`, this low-level syscall is used to write the value `value` in the storage of a specific key at
`address` in the `address_domain`.
# Constructor
Constructors are a special type of function that runs only once when deploying a contract, and can be used to initialize
the state of the contract. Your contract must not have more than one constructor, and that constructor function must be
annotated with the `#[constructor]` attribute. Also, a good practice consists in naming that function `constructor`.
Here's a simple example that demonstrates how to initialize the state of a contract on deployment by defining logic
inside a constructor.
```rust
#[starknet::contract]
mod ExampleConstructor {
    use starknet::ContractAddress;
    #[storage]
    struct Storage {
        names: LegacyMap::<ContractAddress, felt252>,
    }
    // The constructor is decorated with a `#[constructor]` attribute.
    // It is not inside an `impl` block.
    #[constructor]
    fn constructor(ref self: ContractState, name: felt252, address: ContractAddress) {
        self.names.write(address, name);
    }
}
```
# Errors
Errors can be used to handle validation and other conditions that may occur during the execution of a smart contract. If
an error is thrown during the execution of a smart contract call, the execution is stopped and any changes made during
the transaction are reverted. To throw an error, use the `assert` or `panic` functions:
- `assert` is used to validate conditions. If the check fails, an error is thrown along with a specified value, often a
  message. It's similar to the `require` statement in Solidity.
- `panic` immediately halt the execution with the given error value. It should be used when the condition to check is
  complex and for internal errors. It's similar to the `revert` statement in Solidity. (Use `panic_with_felt252` to be
  able to directly pass a felt252 as the error value) Here's a simple example that demonstrates the use of these
  functions:
```rust
#[starknet::interface]
trait IErrorsExample<TContractState> {
    fn test_assert(self: @TContractState, i: u256);
    fn test_panic(self: @TContractState, i: u256);
}
#[starknet::contract]
mod ErrorsExample {
    #[storage]
    struct Storage {}
    #[abi(embed_v0)]
    impl ErrorsExample of super::IErrorsExample<ContractState> {
        fn test_assert(self: @ContractState, i: u256) {
            // Assert used to validate a condition
            // and abort execution if the condition is not met
            assert(i > 0, 'i must be greater than 0');
        }
        fn test_panic(self: @ContractState, i: u256) {
            if (i == 0) {
                // Panic used to abort execution directly
                panic_with_felt252('i must not be 0');
            }
        }
    }
}
```
## Custom errors
You can make error handling easier by defining your error codes in a specific module.
```rust
mod Errors {
    const NOT_POSITIVE: felt252 = 'must be greater than 0';
    const NOT_NULL: felt252 = 'must not be null';
}
#[starknet::interface]
trait ICustomErrorsExample<TContractState> {
    fn test_assert(self: @TContractState, i: u256);
    fn test_panic(self: @TContractState, i: u256);
}
#[starknet::contract]
mod CustomErrorsExample {
    use super::Errors;
    #[storage]
    struct Storage {}
    #[abi(embed_v0)]
    impl CustomErrorsExample of super::ICustomErrorsExample<ContractState> {
        fn test_assert(self: @ContractState, i: u256) {
            assert(i > 0, Errors::NOT_POSITIVE);
        }
        fn test_panic(self: @ContractState, i: u256) {
            if (i == 0) {
                panic_with_felt252(Errors::NOT_NULL);
            }
        }
    }
}
```
# Factory Pattern
The factory pattern is a well known pattern in object oriented programming. It provides an abstraction on how to
instantiate a class. In the case of smart contracts, we can use this pattern by defining a factory contract that have
the sole responsibility of creating and managing other contracts.
## Class hash and contract instance
In Starknet, there's a separation between contract's classes and instances. A contract class serves as a blueprint,
defined by the underling Cairo bytecode, contract's entrypoints, ABI and Sierra program hash. The contract class is
identified by a class hash. When you want to add a new class to the network, you first need to declare it. When
deploying a contract, you need to specify the class hash of the contract you want to deploy. Each instance of a contract
has their own storage regardless of the class hash. Using the factory pattern, we can deploy multiple instances of the
same contract class and handle upgrades easily.
## Minimal example
Here's a minimal example of a factory contract that deploy the `SimpleCounter` contract:
```rust
use starknet::{ContractAddress, ClassHash};
#[starknet::interface]
trait ICounterFactory<TContractState> {
    /// Create a new counter contract from stored arguments
    fn create_counter(ref self: TContractState) -> ContractAddress;
    /// Create a new counter contract from the given arguments
    fn create_counter_at(ref self: TContractState, init_value: u128) -> ContractAddress;
    /// Update the argument
    fn update_init_value(ref self: TContractState, init_value: u128);
    /// Update the class hash of the Counter contract to deploy when creating a new counter
    fn update_counter_class_hash(ref self: TContractState, counter_class_hash: ClassHash);
}
#[starknet::contract]
mod CounterFactory {
    use starknet::{ContractAddress, ClassHash};
    use starknet::syscalls::deploy_syscall;
    #[storage]
    struct Storage {
        /// Store the constructor arguments of the contract to deploy
        init_value: u128,
        /// Store the class hash of the contract to deploy
        counter_class_hash: ClassHash,
    }
    #[constructor]
    fn constructor(ref self: ContractState, init_value: u128, class_hash: ClassHash) {
        self.init_value.write(init_value);
        self.counter_class_hash.write(class_hash);
    }
    #[abi(embed_v0)]
    impl Factory of super::ICounterFactory<ContractState> {
        fn create_counter_at(ref self: ContractState, init_value: u128) -> ContractAddress {
            // Contructor arguments
            let mut constructor_calldata: Array::<felt252> = array![init_value.into()];
            // Contract deployment
            let (deployed_address, _) = deploy_syscall(
                self.counter_class_hash.read(), 0, constructor_calldata.span(), false
            )
                .expect('failed to deploy counter');
            deployed_address
        }
        fn create_counter(ref self: ContractState) -> ContractAddress {
            self.create_counter_at(self.init_value.read())
        }
        fn update_init_value(ref self: ContractState, init_value: u128) {
            self.init_value.write(init_value);
        }
        fn update_counter_class_hash(ref self: ContractState, counter_class_hash: ClassHash) {
            self.counter_class_hash.write(counter_class_hash);
        }
    }
}
```
This factory can be used to deploy multiple instances of the `SimpleCounter` contract by calling the `create_counter`
and `create_counter_at` functions. The `SimpleCounter` class hash is stored inside the factory, and can be upgraded with
the `update_counter_class_hash` function which allows to reuse the same factory contract when the `SimpleCounter`
contract is upgraded. This minimal example lacks several useful features such as access control, tracking of deployed
contracts, events, ...
# Tuples
Tuples is a data type to group a fixed number of items of potentially different types into a single compound structure.
Unlike arrays, tuples have a set length and can contain elements of varying types. Once a tuple is created, its size
cannot change. For example:
```rust
fn tuple() {
    let address = "0x000";
    let age = 20;
    let active = true;
    // Create tuple
    let user_tuple = (address, age, active);
    // Access tuple
    let (address, age, active) = stored_tuple;
}
```
# Storing Arrays
On Starknet, complex values (e.g., tuples or structs), are stored in a continuous segment starting from the address of
the storage variable. There is a 256 field elements limitation to the maximal size of a complex storage value, meaning
that to store arrays of more than 255 elements in storage, we would need to split it into segments of size `n <= 255`
and store these segments in multiple storage addresses. There is currently no native support for storing arrays in
Cairo, so you will need to write your own implementation of the `Store` trait for the type of array you wish to store.
> Note: While storing arrays in storage is possible, it is not always recommended, as the read and write operations can
> get very costly. For example, reading an array of size `n` requires `n` storage reads, and writing to an array of size
> `n` requires `n` storage writes. If you only need to access a single element of the array at a time, it is recommended
> to use a `LegacyMap` and store the length in another variable instead. The following example demonstrates how to write
> a simple implementation of the `StorageAccess` trait for the `Array<felt252>` type, allowing us to store arrays of up
> to 255 `felt252` elements.
```rust
use starknet::{
    StorageBaseAddress, Store, SyscallResult, storage_read_syscall, storage_write_syscall,
    storage_address_from_base_and_offset
};
impl StoreFelt252Array of Store<Array<felt252>> {
    fn read(address_domain: u32, base: StorageBaseAddress) -> SyscallResult<Array<felt252>> {
        StoreFelt252Array::read_at_offset(address_domain, base, 0)
    }
    fn write(
        address_domain: u32, base: StorageBaseAddress, value: Array<felt252>
    ) -> SyscallResult<()> {
        StoreFelt252Array::write_at_offset(address_domain, base, 0, value)
    }
    fn read_at_offset(
        address_domain: u32, base: StorageBaseAddress, mut offset: u8
    ) -> SyscallResult<Array<felt252>> {
        let mut arr: Array<felt252> = ArrayTrait::new();
        // Read the stored array's length. If the length is superior to 255, the read will fail.
        let len: u8 = Store::<u8>::read_at_offset(address_domain, base, offset)
            .expect('Storage Span too large');
        offset += 1;
        // Sequentially read all stored elements and append them to the array.
        let exit = len + offset;
        loop {
            if offset >= exit {
                break;
            }
            let value = Store::<felt252>::read_at_offset(address_domain, base, offset).unwrap();
            arr.append(value);
            offset += Store::<felt252>::size();
        };
        // Return the array.
        Result::Ok(arr)
    }
    fn write_at_offset(
        address_domain: u32, base: StorageBaseAddress, mut offset: u8, mut value: Array<felt252>
    ) -> SyscallResult<()> {
        // // Store the length of the array in the first storage slot.
        let len: u8 = value.len().try_into().expect('Storage - Span too large');
        Store::<u8>::write_at_offset(address_domain, base, offset, len);
        offset += 1;
        // Store the array elements sequentially
        loop {
            match value.pop_front() {
                Option::Some(element) => {
                    Store::<felt252>::write_at_offset(address_domain, base, offset, element);
                    offset += Store::<felt252>::size();
                },
                Option::None(_) => { break Result::Ok(()); }
            };
        }
    }
    fn size() -> u8 {
        255 * Store::<felt252>::size()
    }
}
#[starknet::interface]
trait IStoreArrayContract<TContractState> {
    fn store_array(ref self: TContractState, arr: Array<felt252>);
    fn read_array(self: @TContractState) -> Array<felt252>;
}
#[starknet::contract]
mod StoreArrayContract {
    use super::StoreFelt252Array;
    #[storage]
    struct Storage {
        arr: Array<felt252>
    }
    #[abi(embed_v0)]
    impl StoreArrayImpl of super::IStoreArrayContract<ContractState> {
        fn store_array(ref self: ContractState, arr: Array<felt252>) {
            self.arr.write(arr);
        }
        fn read_array(self: @ContractState) -> Array<felt252> {
            self.arr.read()
        }
    }
}
```
You can then import this implementation in your contract and use it to store arrays in storage:
```rust
use starknet::{
    StorageBaseAddress, Store, SyscallResult, storage_read_syscall, storage_write_syscall,
    storage_address_from_base_and_offset
};
impl StoreFelt252Array of Store<Array<felt252>> {
    fn read(address_domain: u32, base: StorageBaseAddress) -> SyscallResult<Array<felt252>> {
        StoreFelt252Array::read_at_offset(address_domain, base, 0)
    }
    fn write(
        address_domain: u32, base: StorageBaseAddress, value: Array<felt252>
    ) -> SyscallResult<()> {
        StoreFelt252Array::write_at_offset(address_domain, base, 0, value)
    }
    fn read_at_offset(
        address_domain: u32, base: StorageBaseAddress, mut offset: u8
    ) -> SyscallResult<Array<felt252>> {
        let mut arr: Array<felt252> = ArrayTrait::new();
        // Read the stored array's length. If the length is superior to 255, the read will fail.
        let len: u8 = Store::<u8>::read_at_offset(address_domain, base, offset)
            .expect('Storage Span too large');
        offset += 1;
        // Sequentially read all stored elements and append them to the array.
        let exit = len + offset;
        loop {
            if offset >= exit {
                break;
            }
            let value = Store::<felt252>::read_at_offset(address_domain, base, offset).unwrap();
            arr.append(value);
            offset += Store::<felt252>::size();
        };
        // Return the array.
        Result::Ok(arr)
    }
    fn write_at_offset(
        address_domain: u32, base: StorageBaseAddress, mut offset: u8, mut value: Array<felt252>
    ) -> SyscallResult<()> {
        // // Store the length of the array in the first storage slot.
        let len: u8 = value.len().try_into().expect('Storage - Span too large');
        Store::<u8>::write_at_offset(address_domain, base, offset, len);
        offset += 1;
        // Store the array elements sequentially
        loop {
            match value.pop_front() {
                Option::Some(element) => {
                    Store::<felt252>::write_at_offset(address_domain, base, offset, element);
                    offset += Store::<felt252>::size();
                },
                Option::None(_) => { break Result::Ok(()); }
            };
        }
    }
    fn size() -> u8 {
        255 * Store::<felt252>::size()
    }
}
#[starknet::interface]
trait IStoreArrayContract<TContractState> {
    fn store_array(ref self: TContractState, arr: Array<felt252>);
    fn read_array(self: @TContractState) -> Array<felt252>;
}
#[starknet::contract]
mod StoreArrayContract {
    use super::StoreFelt252Array;
    #[storage]
    struct Storage {
        arr: Array<felt252>
    }
    #[abi(embed_v0)]
    impl StoreArrayImpl of super::IStoreArrayContract<ContractState> {
        fn store_array(ref self: ContractState, arr: Array<felt252>) {
            self.arr.write(arr);
        }
        fn read_array(self: @ContractState) -> Array<felt252> {
            self.arr.read()
        }
    }
}
```
# Structs as mapping keys
In order to use structs as mapping keys, you can use `#[derive(Hash)]` on the struct definition. This will automatically
generate a hash function for the struct that can be used to represent the struct as a key in a `LegacyMap`. Consider the
following example in which we would like to use an object of type `Pet` as a key in a `LegacyMap`. The `Pet` struct has
three fields: `name`, `age` and `owner`. We consider that the combination of these three fields uniquely identifies a
pet.
```rust
#[derive(Copy, Drop, Serde, Hash)]
struct Pet {
    name: felt252,
    age: u8,
    owner: felt252,
}
#[starknet::interface]
trait IPetRegistry<TContractState> {
    fn register_pet(ref self: TContractState, key: Pet, timestamp: u64);
    fn get_registration_date(self: @TContractState, key: Pet) -> u64;
}
#[starknet::contract]
mod PetRegistry {
    use hash::{HashStateTrait, Hash};
    use super::Pet;
    #[storage]
    struct Storage {
        registration_time: LegacyMap::<Pet, u64>,
    }
    #[abi(embed_v0)]
    impl PetRegistry of super::IPetRegistry<ContractState> {
        fn register_pet(ref self: ContractState, key: Pet, timestamp: u64) {
            self.registration_time.write(key, timestamp);
        }
        fn get_registration_date(self: @ContractState, key: Pet) -> u64 {
            self.registration_time.read(key)
        }
    }
}
```
# Visibility and Mutability
## Visibility
There are two types of functions in Starknet contracts:
- Functions that are accessible externally and can be called by anyone.
- Functions that are only accessible internally and can only be called by other functions in the contract. These
  functions are also typically divided into two different implementations blocks. The first `impl` block for externally
  accessible functions is explicitly annotated with an `#[abi(embed_v0)]` attribute. This indicates that all the
  functions inside this block can be called either as a transaction or as a view function. The second `impl` block for
  internally accessible functions is not annotated with any attribute, which means that all the functions inside this
  block are private by default.
## State Mutability
Regardless of whether a function is internal or external, it can either modify the contract's state or not. When we
declare functions that interact with storage variables inside a smart contract, we need to explicitly state that we are
accessing the `ContractState` by adding it as the first parameter of the function. This can be done in two different
ways:
- If we want our function to be able to mutate the state of the contract, we pass it by reference like this:
  `ref self: ContractState`.
- If we want our function to be read-only and not mutate the state of the contract, we pass it by snapshot like this:
  `self: @ContractState`. Read-only functions, also called view functions, can be directly called without making a
  transaction. You can interact with them directly through a RPC node to read the contract's state, and they're free to
  call! External functions, that modify the contract's state, on the other side can only be called by making a
  transaction. Internal functions can't be called externally, but the same principle applies regarding state mutability.
  Let's take a look at a simple example contract to see these in action:
```rust
#[starknet::interface]
trait IExampleContract<TContractState> {
    fn set(ref self: TContractState, value: u32);
    fn get(self: @TContractState) -> u32;
}
#[starknet::contract]
mod ExampleContract {
    #[storage]
    struct Storage {
        value: u32
    }
    // The `abi(embed_v0)` attribute indicates that all the functions in this implementation can be called externally.
    // Omitting this attribute would make all the functions in this implementation internal.
    #[abi(embed_v0)]
    impl ExampleContract of super::IExampleContract<ContractState> {
        // The `set` function can be called externally because it is written inside an implementation marked as `#[external]`.
        // It can modify the contract's state as it is passed as a reference.
        fn set(ref self: ContractState, value: u32) {
            self.value.write(value);
        }
        // The `get` function can be called externally because it is written inside an implementation marked as `#[external]`.
        // However, it can't modify the contract's state is passed as a snapshot: it is only a "view" function.
        fn get(self: @ContractState) -> u32 {
            // We can call an internal function from any functions within the contract
            PrivateFunctionsTrait::_read_value(self)
        }
    }
    // The lack of the `external` attribute indicates that all the functions in this implementation can only be called internally.
    // We name the trait `PrivateFunctionsTrait` to indicate that it is an internal trait allowing us to call internal functions.
    #[generate_trait]
    impl PrivateFunctions of PrivateFunctionsTrait {
        // The `_read_value` function is outside the implementation that is marked as `#[abi(embed_v0)]`, so it's an _internal_ function
        // and can only be called from within the contract.
        // However, it can't modify the contract's state is passed as a snapshot: it is only a "view" function.
        fn _read_value(self: @ContractState) -> u32 {
            self.value.read()
        }
    }
}
```
# Mapping
The `LegacyMap` type can be used to represent a collection of key-value.
```rust
use starknet::ContractAddress;
#[starknet::interface]
trait IMappingExample<TContractState> {
    fn register_user(ref self: TContractState, student_add: ContractAddress, studentName: felt252);
    fn record_student_score(
        ref self: TContractState, student_add: ContractAddress, subject: felt252, score: u16
    );
    fn view_student_name(self: @TContractState, student_add: ContractAddress) -> felt252;
    fn view_student_score(
        self: @TContractState, student_add: ContractAddress, subject: felt252
    ) -> u16;
}
#[starknet::contract]
mod MappingContract {
    use starknet::ContractAddress;
    #[storage]
    struct Storage {
        students_name: LegacyMap::<ContractAddress, felt252>,
        students_result_record: LegacyMap::<(ContractAddress, felt252), u16>,
    }
    #[abi(embed_v0)]
    impl External of super::IMappingExample<ContractState> {
        fn register_user(
            ref self: ContractState, student_add: ContractAddress, studentName: felt252
        ) {
            self.students_name.write(student_add, studentName);
        }
        fn record_student_score(
            ref self: ContractState, student_add: ContractAddress, subject: felt252, score: u16
        ) {
            self.students_result_record.write((student_add, subject), score);
        }
        fn view_student_name(self: @ContractState, student_add: ContractAddress) -> felt252 {
            self.students_name.read(student_add)
        }
        fn view_student_score(
            self: @ContractState, student_add: ContractAddress, subject: felt252
        ) -> u16 {
            // for a 2D mapping its important to take note of the amount of brackets being used.
            self.students_result_record.read((student_add, subject))
        }
    }
}
```
# Felt252
Felt252 is a fundamental data type in Cairo from which all other data types are derived. Felt252 can also be used to
store short-string representations with a maximum length of 31 characters. For example:
```rust
fn felt() {
    let felt: felt252 = 100;
    let felt_as_str = 'Hello Starknet!';
    let felt = felt + felt_as_str;
}
```
# Struct
A struct is a data type similar to tuple. Like tuples they can be used to hold data of different types. For example:
```rust
// With Store, you can store Data's structs in the storage part of contracts.
#[derive(Drop, starknet::Store)]
struct Data {
    address: starknet::ContractAddress,
    age: u8
}
```
# Type casting
Cairo supports the conversion from one scalar types to another by using the into and try_into methods. `traits::Into` is
used for conversion from a smaller data type to a larger data type, while `traits::TryInto` is used when converting from
a larger to a smaller type that might not fit. For example:
```rust
fn type_casting() {
    let a_number: u32 = 15;
    let my_felt252 = 15;
    // Since a u32 might not fit in a u8 and a u16, we need to use try_into,
    // then unwrap the Option<T> type thats returned.
    let new_u8: u8 = a_number.try_into().unwrap();
    let new_u16: u16 = a_number.try_into().unwrap();
    // since new_u32 is the of the same type (u32) as rand_number, we can directly assign them,
    // or use the .into() method.
    let new_u32: u32 = a_number;
    // When typecasting from a smaller size to an equal or larger size we use the .into() method.
    // Note: u64 and u128 are larger than u32, so a u32 type will always fit into them.
    let new_u64: u64 = a_number.into();
    let new_u128: u128 = a_number.into();
    // Since a felt252 is smaller than a u256, we can use the into() method
    let new_u256: u256 = my_felt252.into();
    let new_felt252: felt252 = new_u16.into();
    //note a usize is smaller than a felt so we use the try_into
    let new_usize: usize = my_felt252.try_into().unwrap();
}
```
