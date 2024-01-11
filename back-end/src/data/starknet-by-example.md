# Component-Contract Storage Collisions

Components can declare their own storage variables.

When a contract use a component, the component storage is merged with the contract storage. The storage layout is only
determined by the variables names, so variables with the same name will collide.

> In a future release, the `#[substorage(v1)]` will determine the storage layout based on the component as well, so
> collisions will be avoided.

A good practice is to prefix the component storage variables with the component name, as shown in the
[Switchable component example](./how_to.md).

#### Example

Here's an example of a collision on the `switchable_value` storage variable of the `Switchable` component.

Interface:

```rust

#[starknet::interface]
trait ISwitchCollision<TContractState> {
    fn set(ref self: TContractState, value: bool);
    fn get(ref self: TContractState) -> bool;
}


#[starknet::contract]
mod SwitchCollisionContract {
    use components::switchable::switchable_component;

    component!(path: switchable_component, storage: switch, event: SwitchableEvent);

    #[abi(embed_v0)]
    impl SwitchableImpl = switchable_component::Switchable<ContractState>;
    impl SwitchableInternalImpl = switchable_component::SwitchableInternalImpl<ContractState>;


    #[storage]
    struct Storage {
        switchable_value: bool,
        #[substorage(v0)]
        switch: switchable_component::Storage,
    }


    #[constructor]
    fn constructor(ref self: ContractState) {
        self.switch._off();
    }

    #[event]
    #[derive(Drop, starknet::Event)]
    enum Event {
        SwitchableEvent: switchable_component::Event,
    }

    #[external(v0)]
    impl SwitchCollisionContract of super::ISwitchCollision<ContractState> {
        fn set(ref self: ContractState, value: bool) {
            self.switchable_value.write(value);
        }

        fn get(ref self: ContractState) -> bool {
            self.switchable_value.read()
        }
    }
}


```

Here's the storage of the contract (you can expand the code snippet to see the full contract):

```rust

#[starknet::interface]
trait ISwitchCollision<TContractState> {
    fn set(ref self: TContractState, value: bool);
    fn get(ref self: TContractState) -> bool;
}


#[starknet::contract]
mod SwitchCollisionContract {
    use components::switchable::switchable_component;

    component!(path: switchable_component, storage: switch, event: SwitchableEvent);

    #[abi(embed_v0)]
    impl SwitchableImpl = switchable_component::Switchable<ContractState>;
    impl SwitchableInternalImpl = switchable_component::SwitchableInternalImpl<ContractState>;


    #[storage]
    struct Storage {
        switchable_value: bool,
        #[substorage(v0)]
        switch: switchable_component::Storage,
    }


    #[constructor]
    fn constructor(ref self: ContractState) {
        self.switch._off();
    }

    #[event]
    #[derive(Drop, starknet::Event)]
    enum Event {
        SwitchableEvent: switchable_component::Event,
    }

    #[external(v0)]
    impl SwitchCollisionContract of super::ISwitchCollision<ContractState> {
        fn set(ref self: ContractState, value: bool) {
            self.switchable_value.write(value);
        }

        fn get(ref self: ContractState) -> bool {
            self.switchable_value.read()
        }
    }
}


```

Both the contract and the component have a `switchable_value` storage variable, so they collide:

```rust
mod switch_collision_tests {
    use components::switchable::switchable_component::SwitchableInternalTrait;
    use components::switchable::{ISwitchable, ISwitchableDispatcher, ISwitchableDispatcherTrait};

    use components::contracts::switch_collision::{
        SwitchCollisionContract, ISwitchCollisionDispatcher, ISwitchCollisionDispatcherTrait
    };

    use core::starknet::storage::StorageMemberAccessTrait;
    use starknet::deploy_syscall;

    fn deploy() -> (ISwitchCollisionDispatcher, ISwitchableDispatcher) {
        let (contract_address, _) = deploy_syscall(
            SwitchCollisionContract::TEST_CLASS_HASH.try_into().unwrap(), 0, array![].span(), false
        )
            .unwrap();

        (
            ISwitchCollisionDispatcher { contract_address },
            ISwitchableDispatcher { contract_address },
        )
    }

    #[test]
    #[available_gas(2000000)]

    fn test_collision() {
        let (mut contract, mut contract_iswitch) = deploy();

        assert(contract.get() == false, 'value !off');
        assert(contract_iswitch.is_on() == false, 'switch !off');

        contract_iswitch.switch();
        assert(contract_iswitch.is_on() == true, 'switch !on');
        assert(contract.get() == true, 'value !on');

        // `collision` between component storage 'value' and contract storage 'value'
        assert(contract.get() == contract_iswitch.is_on(), 'value != switch');

        contract.set(false);
        assert(contract.get() == contract_iswitch.is_on(), 'value != switch');
    }

}



```


# Calling other contracts

There are two different ways to call other contracts in Cairo.

The easiest way to call other contracts is by using the dispatcher of the contract you want to call.
You can read more about Dispatchers in the [Cairo Book](https://book.cairo-lang.org/ch99-02-02-contract-dispatcher-library-dispatcher-and-system-calls.html#contract-dispatcher)

The other way is to use the `starknet::call_contract_syscall` syscall yourself. However, this method is not recommended.

In order to call other contracts using dispatchers, you will need to define the called contract's interface as a trait annotated with the `#[starknet::interface]` attribute, and then import the `IContractDispatcher` and `IContractDispatcherTrait` items in your contract.

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
contract and that it can't be used elsewhere.

Here we demonstrate how to use the `LegacyMap` type within a Cairo contract, to map between a key of type
`ContractAddress` and value of type `felt252`. The key-value types are specified within angular brackets <>. We write to
the map by calling the `write()` method, passing in both the key and value. Similarly, we can read the value associated
with a given key by calling the `read()` method and passing in the relevant key.

Some additional notes:

- More complex key-value mappings are possible, for example we could use
  `LegacyMap::<(ContractAddress, ContractAddress), felt252>` to create an allowance on an ERC20 token contract.

- In mappings, the address of the value at key `k_1,...,k_n` is `h(...h(h(sn_keccak(variable_name),k_1),k_2),...,k_n)`
  where `ℎ` is the Pedersen hash and the final value is taken `mod2251−256`. You can learn more about the contract
  storage layout in the
  [Starknet Documentation](https://docs.starknet.io/documentation/architecture_and_concepts/Smart_Contracts/contract-storage/#storage_variables)

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
the data at a later time. Events data can be indexed by adding a `#[key]` attribute to a field member.

Here's a simple example of a contract using events that emit an event each time a counter is incremented by the
"increment" function:

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


```rust
use starknet::ContractAddress;

#[starknet::interface]
trait IMarketplace<TContractState> {
    fn create_listing(
        ref self: TContractState,
        assetContract: ContractAddress,
        tokenId: u256,
        startTime: u256,
        secondsUntilEndTime: u256,
        quantityToList: u256,
        currencyToAccept: ContractAddress,
        buyoutPricePerToken: u256,
        tokenTypeOfListing: u256,
    );
    fn cancel_direct_listing(ref self: TContractState, _listingId: u256);
    fn buy(
        ref self: TContractState,
        _listingId: u256,
        _buyFor: ContractAddress,
        _quantityToBuy: u256,
        _currency: ContractAddress,
        _totalPrice: u256,
    );
    fn accept_offer(
        ref self: TContractState,
        _listingId: u256,
        _offeror: ContractAddress,
        _currency: ContractAddress,
        _pricePerToken: u256
    );
    fn offer(
        ref self: TContractState,
        _listingId: u256,
        _quantityWanted: u256,
        _currency: ContractAddress,
        _pricePerToken: u256,
        _expirationTimestamp: u256
    );
    fn update_listing(
        ref self: TContractState,
        _listingId: u256,
        _quantityToList: u256,
        _reservePricePerToken: u256,
        _buyoutPricePerToken: u256,
        _currencyToAccept: ContractAddress,
        _startTime: u256,
        _secondsUntilEndTime: u256,
    );
    fn get_total_listings(self: @TContractState) -> u256;
}

#[starknet::interface]
trait IERC20<TContractState> {
    fn balance_of(self: @TContractState, account: ContractAddress) -> u256;
    fn allowance(self: @TContractState, owner: ContractAddress, spender: ContractAddress) -> u256;
    fn transfer(ref self: TContractState, recipient: ContractAddress, amount: u256);
    fn transfer_from(
        ref self: TContractState, sender: ContractAddress, recipient: ContractAddress, amount: u256
    );
}

#[starknet::interface]
trait IERC721<TContractState> {
    fn owner_of(self: @TContractState, token_id: u256) -> ContractAddress;
    fn get_approved(self: @TContractState, token_id: u256) -> ContractAddress;
    fn is_approved_for_all(
        self: @TContractState, owner: ContractAddress, operator: ContractAddress
    ) -> bool;
    fn transfer_from(
        ref self: TContractState, from: ContractAddress, to: ContractAddress, token_id: u256
    );
}

#[starknet::interface]
trait IERC1155<TContractState> {
    fn balance_of(self: @TContractState, account: ContractAddress, id: u256) -> u256;
    fn is_approved_for_all(
        self: @TContractState, account: ContractAddress, operator: ContractAddress
    ) -> bool;
    fn safe_transfer_from(
        ref self: TContractState,
        from: ContractAddress,
        to: ContractAddress,
        id: u256,
        amount: u256,
        data: Span<felt252>
    );
}

#[starknet::contract]
mod Marketplace {
    use reddio_cairo::marketplace::IMarketplace;
    use starknet::ContractAddress;
    use starknet::get_caller_address;
    use starknet::get_contract_address;
    use starknet::info::get_block_timestamp;
    use starknet::contract_address_const;
    use starknet::syscalls::replace_class_syscall;
    use starknet::class_hash::ClassHash;
    use core::traits::Into;

    use super::IERC20Dispatcher;
    use super::IERC20DispatcherTrait;
    use super::IERC721Dispatcher;
    use super::IERC721DispatcherTrait;
    use super::IERC1155Dispatcher;
    use super::IERC1155DispatcherTrait;

    const ERC721: u256 = 0;
    const ERC1155: u256 = 1;


    #[storage]
    struct Storage {
        operator: ContractAddress,
        total_listings: u256,
        listings: LegacyMap::<u256, Listing>,
        offers: LegacyMap::<(u256, ContractAddress), Offer>,
    }

    #[event]
    #[derive(Drop, starknet::Event)]
    enum Event {
        ListingAdded: ListingAdded,
        ListingUpdated: ListingUpdated,
        ListingRemoved: ListingRemoved,
        NewOffer: NewOffer,
        NewSale: NewSale,
    }

    #[derive(Drop, starknet::Event)]
    struct NewSale {
        #[key]
        listingId: u256,
        #[key]
        assetContract: ContractAddress,
        #[key]
        lister: ContractAddress,
        buyer: ContractAddress,
        quantityBought: u256,
        totalPricePaid: u256,
    }

    #[derive(Drop, starknet::Event)]
    struct ListingAdded {
        #[key]
        listingId: u256,
        #[key]
        assetContract: ContractAddress,
        #[key]
        lister: ContractAddress,
        listing: Listing,
    }
    #[derive(Drop, starknet::Event)]
    struct ListingUpdated {
        #[key]
        listingId: u256,
        #[key]
        listingCreator: ContractAddress,
    }

    #[derive(Drop, starknet::Event)]
    struct ListingRemoved {
        #[key]
        listingId: u256,
        #[key]
        listingCreator: ContractAddress,
    }

    #[derive(Drop, starknet::Event)]
    struct NewOffer {
        // todo listingType
        #[key]
        listingId: u256,
        #[key]
        offeror: ContractAddress,
        quantityWanted: u256,
        totalOfferAmount: u256,
        currency: ContractAddress,
    }

    #[derive(Copy, Drop, Serde, starknet::Store)]
    struct Offer {
        listingId: u256,
        offeror: ContractAddress,
        quantityWanted: u256,
        currency: ContractAddress,
        pricePerToken: u256,
        expirationTimestamp: u256,
    }

    #[derive(Copy, Drop, Serde, starknet::Store)]
    struct Listing {
        listingId: u256,
        tokenOwner: ContractAddress,
        assetContract: ContractAddress,
        tokenId: u256,
        startTime: u256,
        endTime: u256,
        quantity: u256,
        currency: ContractAddress,
        buyoutPricePerToken: u256,
        // 0 -> erc721, 1 -> erc1155
        tokenType: u256,
    // todo reservePricePerToken tokenType listingType
    }

    #[constructor]
    fn constructor(ref self: ContractState,) {
        self.operator.write(get_caller_address());
    }

    #[external(v0)]
    fn upgrade(self: @ContractState, new_class_hash: ClassHash) {
        assert(!new_class_hash.is_zero(), 'Class hash cannot be zero');
        assert(get_caller_address() == self.operator.read(), 'Operator required');
        replace_class_syscall(new_class_hash);
    }

    #[abi(embed_v0)]
    impl IMarketplaceImpl of super::IMarketplace<ContractState> {
        fn create_listing(
            ref self: ContractState,
            assetContract: ContractAddress,
            tokenId: u256,
            startTime: u256,
            secondsUntilEndTime: u256,
            quantityToList: u256,
            currencyToAccept: ContractAddress,
            buyoutPricePerToken: u256,
            tokenTypeOfListing: u256,
        ) {
            let listingId = self.total_listings.read();
            self.total_listings.write(listingId + 1);

            let tokenOwner = get_caller_address();
            let tokenAmountToList = self.get_safe_quantity(tokenTypeOfListing, quantityToList);
            assert(tokenAmountToList > 0, 'QUANTITY');
            // hasRole
            let mut _startTime = startTime;
            let currentTime = get_block_timestamp().into();
            if (_startTime < currentTime) {
                assert(currentTime - _startTime < 3600, 'ST');
                _startTime = currentTime;
            }

            self
                .validate_ownership_and_approval(
                    tokenOwner, assetContract, tokenId, tokenAmountToList, tokenTypeOfListing
                );

            let newListing = Listing {
                listingId: listingId,
                tokenOwner: tokenOwner,
                assetContract: assetContract,
                tokenId: tokenId,
                startTime: _startTime,
                endTime: _startTime + secondsUntilEndTime,
                quantity: tokenAmountToList,
                currency: currencyToAccept,
                buyoutPricePerToken: buyoutPricePerToken,
                // 0 -> erc721, 1 -> erc1155
                tokenType: tokenTypeOfListing,
            };

            self.listings.write(listingId, newListing);
            self
                .emit(
                    Event::ListingAdded(
                        ListingAdded {
                            listingId, assetContract, lister: tokenOwner, listing: newListing,
                        }
                    )
                );
        }

        fn cancel_direct_listing(ref self: ContractState, _listingId: u256) {
            self.only_listing_creator(_listingId);
            let targetListing = self.listings.read(_listingId);
            let empty_listing = Listing {
                listingId: 0,
                tokenOwner: contract_address_const::<0>(),
                assetContract: contract_address_const::<0>(),
                tokenId: 0,
                startTime: 0,
                endTime: 0,
                quantity: 0,
                currency: contract_address_const::<0>(),
                buyoutPricePerToken: 0,
                // 0 -> erc721, 1 -> erc1155
                // make to default here
                tokenType: 0,
            };
            self.listings.write(_listingId, empty_listing);
            self
                .emit(
                    Event::ListingRemoved(
                        ListingRemoved {
                            listingId: _listingId, listingCreator: targetListing.tokenOwner
                        }
                    )
                );
        }


        fn offer(
            ref self: ContractState,
            _listingId: u256,
            _quantityWanted: u256,
            _currency: ContractAddress,
            _pricePerToken: u256,
            _expirationTimestamp: u256
        ) {
            self.only_existing_listing(_listingId);
            let targetListing = self.listings.read(_listingId);
            assert(
                targetListing.endTime > get_block_timestamp().into()
                    && targetListing.startTime < get_block_timestamp().into(),
                'inactive listing.'
            );
            let mut newOffer = Offer {
                listingId: _listingId,
                offeror: get_caller_address(),
                quantityWanted: _quantityWanted,
                currency: _currency,
                pricePerToken: _pricePerToken,
                expirationTimestamp: _expirationTimestamp
            };

            newOffer
                .quantityWanted = self
                .get_safe_quantity(targetListing.tokenType, _quantityWanted);
            self.handle_offer(targetListing, newOffer);
        }

        fn accept_offer(
            ref self: ContractState,
            _listingId: u256,
            _offeror: ContractAddress,
            _currency: ContractAddress,
            _pricePerToken: u256
        ) {
            self.only_listing_creator(_listingId);
            self.only_existing_listing(_listingId);
            let targetOffer = self.offers.read((_listingId, _offeror));
            let targetListing = self.listings.read(_listingId);

            assert(
                _currency == targetOffer.currency && _pricePerToken == targetOffer.pricePerToken,
                '!PRICE'
            );
            assert(targetOffer.expirationTimestamp > get_block_timestamp().into(), 'EXPIRED');
            let emptyOffer = Offer {
                listingId: 0,
                offeror: contract_address_const::<0>(),
                quantityWanted: 0,
                currency: contract_address_const::<0>(),
                pricePerToken: 0,
                expirationTimestamp: 0,
            };

            self.offers.write((_listingId, _offeror), emptyOffer);

            self
                .execute_sale(
                    targetListing,
                    _offeror,
                    _offeror,
                    targetOffer.currency,
                    targetOffer.pricePerToken * targetOffer.quantityWanted,
                    targetOffer.quantityWanted
                );
        }

        fn buy(
            ref self: ContractState,
            _listingId: u256,
            _buyFor: ContractAddress,
            _quantityToBuy: u256,
            _currency: ContractAddress,
            _totalPrice: u256,
        ) {
            self.only_existing_listing(_listingId);
            let targetListing = self.listings.read(_listingId);
            let payer = get_caller_address();

            assert(
                _currency == targetListing.currency
                    && _totalPrice == (targetListing.buyoutPricePerToken * _quantityToBuy),
                '!PRICE'
            );

            self
                .execute_sale(
                    targetListing,
                    payer,
                    _buyFor,
                    targetListing.currency,
                    targetListing.buyoutPricePerToken * _quantityToBuy,
                    _quantityToBuy
                );
        }

        fn update_listing(
            ref self: ContractState,
            _listingId: u256,
            _quantityToList: u256,
            _reservePricePerToken: u256,
            _buyoutPricePerToken: u256,
            _currencyToAccept: ContractAddress,
            mut _startTime: u256,
            _secondsUntilEndTime: u256,
        ) {
            self.only_listing_creator(_listingId);
            let targetListing = self.listings.read(_listingId);
            let safeNewQuantity = self.get_safe_quantity(targetListing.tokenType, _quantityToList);
            assert(safeNewQuantity != 0, 'QUANTITY');

            let timestamp: u256 = get_block_timestamp().into();
            if (_startTime < timestamp) {
                assert(timestamp - _startTime < 3600, 'ST');
                _startTime = timestamp;
            }
            let newStartTime = if _startTime == 0 {
                targetListing.startTime
            } else {
                _startTime
            };
            self
                .listings
                .write(
                    _listingId,
                    Listing {
                        listingId: _listingId,
                        tokenOwner: get_caller_address(),
                        assetContract: targetListing.assetContract,
                        tokenId: targetListing.tokenId,
                        startTime: newStartTime,
                        endTime: if _secondsUntilEndTime == 0 {
                            targetListing.endTime
                        } else {
                            newStartTime + _secondsUntilEndTime
                        },
                        quantity: safeNewQuantity,
                        currency: _currencyToAccept,
                        buyoutPricePerToken: _buyoutPricePerToken,
                        tokenType: targetListing.tokenType,
                    }
                );
            if (targetListing.quantity != safeNewQuantity) {
                self
                    .validate_ownership_and_approval(
                        targetListing.tokenOwner,
                        targetListing.assetContract,
                        targetListing.tokenId,
                        safeNewQuantity,
                        targetListing.tokenType
                    );
            }

            self
                .emit(
                    Event::ListingUpdated(
                        ListingUpdated {
                            listingId: _listingId, listingCreator: targetListing.tokenOwner,
                        }
                    )
                );
        }

        fn get_total_listings(self: @ContractState) -> u256 {
            self.total_listings.read()
        }
    }

    #[generate_trait]
    impl StorageImpl of StorageTrait {
        fn get_safe_quantity(
            self: @ContractState, _tokenType: u256, _quantityToCheck: u256
        ) -> u256 {
            if _quantityToCheck == 0 {
                0
            } else {
                if _tokenType == ERC721 {
                    1
                } else {
                    _quantityToCheck
                }
            }
        }

        fn validate_ownership_and_approval(
            self: @ContractState,
            _tokenOwner: ContractAddress,
            _assetContract: ContractAddress,
            _tokenId: u256,
            _quantity: u256,
            _tokenType: u256
        ) {
            let market = get_contract_address();
            let mut isValid: bool = false;
            if (_tokenType == ERC1155) {
                let token = IERC1155Dispatcher { contract_address: _assetContract };
                isValid = token.balance_of(_tokenOwner, _tokenId) >= _quantity
                    && token.is_approved_for_all(_tokenOwner, market);
            } else if (_tokenType == ERC721) {
                let token = IERC721Dispatcher { contract_address: _assetContract };
                isValid = token.owner_of(_tokenId) == _tokenOwner
                    && token.get_approved(_tokenId) == market
                        || token.is_approved_for_all(_tokenOwner, market);
            }

            assert(isValid, '!BALNFT');
        }

        fn handle_offer(ref self: ContractState, _targetListing: Listing, _newOffer: Offer) {
            assert(
                _newOffer.quantityWanted <= _targetListing.quantity && _targetListing.quantity > 0,
                'insufficient tokens in listing.'
            );
            self
                .validate_ERC20_bal_and_allowance(
                    _newOffer.offeror,
                    _newOffer.currency,
                    _newOffer.pricePerToken * _newOffer.quantityWanted
                );

            self.offers.write((_targetListing.listingId, _newOffer.offeror), _newOffer);
            self
                .emit(
                    Event::NewOffer(
                        NewOffer {
                            listingId: _targetListing.listingId,
                            offeror: _newOffer.offeror,
                            quantityWanted: _newOffer.quantityWanted,
                            totalOfferAmount: _newOffer.pricePerToken * _newOffer.quantityWanted,
                            currency: _newOffer.currency
                        }
                    )
                );
        }

        fn validate_ERC20_bal_and_allowance(
            ref self: ContractState,
            _addrToCheck: ContractAddress,
            _currency: ContractAddress,
            _currencyAmountToCheckAgainst: u256
        ) {
            let token = IERC20Dispatcher { contract_address: _currency };
            assert(
                token.balance_of(_addrToCheck) >= _currencyAmountToCheckAgainst
                    && token
                        .allowance(
                            _addrToCheck, get_contract_address()
                        ) >= _currencyAmountToCheckAgainst,
                '!BAL20'
            );
        }

        fn execute_sale(
            ref self: ContractState,
            mut _targetListing: Listing,
            _payer: ContractAddress,
            _receiver: ContractAddress,
            _currency: ContractAddress,
            _currencyAmountToTransfer: u256,
            _listingTokenAmountToTransfer: u256,
        ) {
            self
                .validate_direct_listing_sale(
                    _targetListing,
                    _payer,
                    _listingTokenAmountToTransfer,
                    _currency,
                    _currencyAmountToTransfer
                );

            _targetListing.quantity -= _listingTokenAmountToTransfer;
            self.listings.write(_targetListing.listingId, _targetListing);
            self
                .payout(
                    _payer,
                    _targetListing.tokenOwner,
                    _currency,
                    _currencyAmountToTransfer,
                    _targetListing
                );
            self
                .transfer_listing_tokens(
                    _targetListing.tokenOwner,
                    _receiver,
                    _listingTokenAmountToTransfer,
                    _targetListing
                );
            self
                .emit(
                    Event::NewSale(
                        NewSale {
                            listingId: _targetListing.listingId,
                            assetContract: _targetListing.assetContract,
                            lister: _targetListing.tokenOwner,
                            buyer: _receiver,
                            quantityBought: _listingTokenAmountToTransfer,
                            totalPricePaid: _currencyAmountToTransfer,
                        }
                    )
                );
        }

        fn validate_direct_listing_sale(
            ref self: ContractState,
            _listing: Listing,
            _payer: ContractAddress,
            _quantityToBuy: u256,
            _currency: ContractAddress,
            settledTotalPrice: u256,
        ) {
            assert(
                _listing.quantity > 0 && _quantityToBuy > 0 && _quantityToBuy <= _listing.quantity,
                'invalid amount of tokens.'
            );
            assert(
                get_block_timestamp().into() < _listing.endTime
                    && get_block_timestamp().into() > _listing.startTime,
                'not within sale window.'
            );
            self.validate_ERC20_bal_and_allowance(_payer, _currency, settledTotalPrice);
            self
                .validate_ownership_and_approval(
                    _listing.tokenOwner,
                    _listing.assetContract,
                    _listing.tokenId,
                    _quantityToBuy,
                    _listing.tokenType
                );
        }

        fn payout(
            ref self: ContractState,
            _payer: ContractAddress,
            _payee: ContractAddress,
            _currencyToUse: ContractAddress,
            _totalPayoutAmount: u256,
            _listing: Listing,
        ) {
            self.safe_transfer_ERC20(_currencyToUse, _payer, _payee, _totalPayoutAmount);
        }

        fn transfer_listing_tokens(
            ref self: ContractState,
            _from: ContractAddress,
            _to: ContractAddress,
            _quantity: u256,
            _listing: Listing,
        ) {
            if _listing.tokenType == ERC1155 {
                let token = IERC1155Dispatcher { contract_address: _listing.assetContract };
                token
                    .safe_transfer_from(
                        _from, _to, _listing.tokenId, _quantity, ArrayTrait::<felt252>::new().span()
                    );
            } else if _listing.tokenType == ERC721 {
                let token = IERC721Dispatcher { contract_address: _listing.assetContract };
                token.transfer_from(_from, _to, _listing.tokenId);
            }
        }

        fn safe_transfer_ERC20(
            ref self: ContractState,
            _currency: ContractAddress,
            _from: ContractAddress,
            _to: ContractAddress,
            _amount: u256,
        ) {
            if (_amount == 0) || (_from == _to) {
                return;
            }

            let token = IERC20Dispatcher { contract_address: _currency };
            if _from == get_contract_address() {
                token.transfer(_to, _amount);
            } else {
                token.transfer_from(_from, _to, _amount);
            }
        }

        fn only_listing_creator(self: @ContractState, _listingId: u256) {
            assert(self.listings.read(_listingId).tokenOwner == get_caller_address(), '!OWNER');
        }

        fn only_existing_listing(self: @ContractState, _listingId: u256) {
            assert(
                self.listings.read(_listingId).assetContract != contract_address_const::<0>(), 'DNE'
            );
        }
    }
}

```


# Writing to any storage slot

On Starknet, a contract's storage is a map with 2^251 slots, where each slot is a felt which is initialized to 0. The
address of storage variables is computed at compile time using the formula:
`storage variable address := pedersen(keccak(variable name), keys)`. Interactions with storage variables are commonly
performed using the `self.var.read()` and `self.var.write()` functions.

Nevertheless, we can use the `storage_write_syscall` and `storage_read_syscall` syscalls, to write to and read from any
storage slot. This is useful when writing to storage variables that are not known at compile time, or to ensure that
even if the contract is upgraded and the computation method of storage variable addresses changes, they remain
accessible.

In the following example, we use the Poseidon hash function to compute the address of a storage variable. Poseidon is a
ZK-friendly hash function that is cheaper and faster than Pedersen, making it an excellent choice for onchain
computations. Once the address is computed, we use the storage syscalls to interact with it.

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
exist only for the duration of that particular function or block execution.

Local variables are stored in memory and are not stored on the blockchain. This means they cannot be accessed from one
execution to another. Local variables are useful for storing temporary data that is relevant only within a specific
context. They also make the code more readable by giving names to intermediate values.

Here's a simple example of a contract with only local variables:

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
allowing the contract to remember and update information over time.

To write or update a storage variable, you need to interact with the contract through an external entrypoint by sending
a transaction.

On the other hand, you can read state variables, for free, without any transaction, simply by interacting with a node.

Here's a simple example of a contract with one storage variable:

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
environment. They can be accessed at any time and from anywhere!

In Starknet, you can access global variables by using specific functions contained in the starknet core libraries.

For example, the `get_caller_address` function returns the address of the caller of the current transaction, and the
`get_contract_address` function returns the address of the current contract.

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

The following `Ownable` component is a simple component that allows the contract to set an owner and provides a `_assert_is_owner` function that can be used to ensure that the caller is the owner.

It can also be used to renounce ownership of a contract, meaning that no one will be able to satisfy the `_assert_is_owner` function.

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


#[cfg(test)]
mod tests {
    use super::{OwnedContract, IOwnedDispatcher, IOwnedDispatcherTrait};
    use components::ownable::{IOwnable, IOwnableDispatcher, IOwnableDispatcherTrait};

    use core::starknet::storage::StorageMemberAccessTrait;

    use starknet::{contract_address_const, ContractAddress};
    use starknet::testing::{set_caller_address, set_contract_address};
    use starknet::deploy_syscall;

    fn deploy() -> (IOwnedDispatcher, IOwnableDispatcher) {
        let (contract_address, _) = deploy_syscall(
            OwnedContract::TEST_CLASS_HASH.try_into().unwrap(), 0, array![].span(), false
        )
            .unwrap();

        (IOwnedDispatcher { contract_address }, IOwnableDispatcher { contract_address },)
    }

    #[test]
    #[available_gas(2000000)]
    fn test_init() {
        let owner = contract_address_const::<'owner'>();
        set_contract_address(owner);
        let (_, ownable) = deploy();

        assert(ownable.owner() == owner, 'wrong_owner');
    }

    #[test]
    #[available_gas(2000000)]
    fn test_wrong_owner() {
        set_contract_address(contract_address_const::<'owner'>());
        let (_, ownable) = deploy();

        let not_owner = contract_address_const::<'not_owner'>();
        assert(ownable.owner() != not_owner, 'wrong_owner');
    }

    #[test]
    #[available_gas(2000000)]
    fn test_do_something() {
        set_contract_address(contract_address_const::<'owner'>());
        let (contract, _) = deploy();

        contract.do_something();
    // Should not panic
    }

    #[test]
    #[available_gas(2000000)]
    #[should_panic]
    fn test_do_something_not_owner() {
        set_contract_address(contract_address_const::<'owner'>());
        let (contract, _) = deploy();

        set_contract_address(contract_address_const::<'not_owner'>());
        contract.do_something();
    }

    #[test]
    #[available_gas(2000000)]
    fn test_transfer_ownership() {
        set_contract_address(contract_address_const::<'initial'>());
        let (contract, ownable) = deploy();

        let new_owner = contract_address_const::<'new_owner'>();
        ownable.transfer_ownership(new_owner);

        assert(ownable.owner() == new_owner, 'wrong_owner');

        set_contract_address(new_owner);
        contract.do_something();
    }

    #[test]
    #[available_gas(2000000)]
    #[should_panic]
    fn test_transfer_ownership_not_owner() {
        set_contract_address(contract_address_const::<'initial'>());
        let (_, ownable) = deploy();

        set_contract_address(contract_address_const::<'not_owner'>());
        ownable.transfer_ownership(contract_address_const::<'new_owner'>());
    }

    #[test]
    #[available_gas(2000000)]
    #[should_panic]
    fn test_transfer_ownership_zero_error() {
        set_contract_address(contract_address_const::<'initial'>());
        let (_, ownable) = deploy();

        ownable.transfer_ownership(Zeroable::zero());
    }

    #[test]
    #[available_gas(2000000)]
    fn test_renounce_ownership() {
        set_contract_address(contract_address_const::<'owner'>());
        let (_, ownable) = deploy();

        ownable.renounce_ownership();
        assert(ownable.owner() == Zeroable::zero(), 'not_zero_owner');
    }

    #[test]
    #[available_gas(2000000)]
    #[should_panic]
    fn test_renounce_ownership_not_owner() {
        set_contract_address(contract_address_const::<'owner'>());
        let (_, ownable) = deploy();

        set_contract_address(contract_address_const::<'not_owner'>());
        ownable.renounce_ownership();
    }

    #[test]
    #[available_gas(2000000)]
    #[should_panic]
    fn test_renounce_ownership_previous_owner() {
        set_contract_address(contract_address_const::<'owner'>());
        let (contract, ownable) = deploy();

        ownable.renounce_ownership();

        contract.do_something();
    }
}


```


# ERC20 Token

Contracts that follow the [ERC20 Standard](https://eips.ethereum.org/EIPS/eip-20) are called ERC20 tokens. They are used
to represent fungible assets.

To create an ERC20 conctract, it must implement the following interface:

```rust
use starknet::ContractAddress;


#[starknet::interface]
trait IERC20<TContractState> {
    fn get_name(self: @TContractState) -> felt252;
    fn get_symbol(self: @TContractState) -> felt252;
    fn get_decimals(self: @TContractState) -> u8;
    fn get_total_supply(self: @TContractState) -> felt252;
    fn balance_of(self: @TContractState, account: ContractAddress) -> felt252;
    fn allowance(
        self: @TContractState, owner: ContractAddress, spender: ContractAddress
    ) -> felt252;
    fn transfer(ref self: TContractState, recipient: ContractAddress, amount: felt252);
    fn transfer_from(
        ref self: TContractState,
        sender: ContractAddress,
        recipient: ContractAddress,
        amount: felt252
    );
    fn approve(ref self: TContractState, spender: ContractAddress, amount: felt252);
    fn increase_allowance(ref self: TContractState, spender: ContractAddress, added_value: felt252);
    fn decrease_allowance(
        ref self: TContractState, spender: ContractAddress, subtracted_value: felt252
    );
}



#[starknet::contract]
mod erc20 {
    use zeroable::Zeroable;
    use starknet::get_caller_address;
    use starknet::contract_address_const;
    use starknet::ContractAddress;

    #[storage]
    struct Storage {
        name: felt252,
        symbol: felt252,
        decimals: u8,
        total_supply: felt252,
        balances: LegacyMap::<ContractAddress, felt252>,
        allowances: LegacyMap::<(ContractAddress, ContractAddress), felt252>,
    }

    #[event]
    #[derive(Drop, starknet::Event)]
    enum Event {
        Transfer: Transfer,
        Approval: Approval,
    }
    #[derive(Drop, starknet::Event)]
    struct Transfer {
        from: ContractAddress,
        to: ContractAddress,
        value: felt252,
    }
    #[derive(Drop, starknet::Event)]
    struct Approval {
        owner: ContractAddress,
        spender: ContractAddress,
        value: felt252,
    }

    mod Errors {
        const APPROVE_FROM_ZERO: felt252 = 'ERC20: approve from 0';
        const APPROVE_TO_ZERO: felt252 = 'ERC20: approve to 0';
        const TRANSFER_FROM_ZERO: felt252 = 'ERC20: transfer from 0';
        const TRANSFER_TO_ZERO: felt252 = 'ERC20: transfer to 0';
        const BURN_FROM_ZERO: felt252 = 'ERC20: burn from 0';
        const MINT_TO_ZERO: felt252 = 'ERC20: mint to 0';
    }

    #[constructor]
    fn constructor(
        ref self: ContractState,
        recipient: ContractAddress,
        name: felt252,
        decimals: u8,
        initial_supply: felt252,
        symbol: felt252
    ) {
        self.name.write(name);
        self.symbol.write(symbol);
        self.decimals.write(decimals);
        self.mint(recipient, initial_supply);
    }

    #[abi(embed_v0)]
    impl IERC20Impl of super::IERC20<ContractState> {
        fn get_name(self: @ContractState) -> felt252 {
            self.name.read()
        }

        fn get_symbol(self: @ContractState) -> felt252 {
            self.symbol.read()
        }

        fn get_decimals(self: @ContractState) -> u8 {
            self.decimals.read()
        }

        fn get_total_supply(self: @ContractState) -> felt252 {
            self.total_supply.read()
        }

        fn balance_of(self: @ContractState, account: ContractAddress) -> felt252 {
            self.balances.read(account)
        }

        fn allowance(
            self: @ContractState, owner: ContractAddress, spender: ContractAddress
        ) -> felt252 {
            self.allowances.read((owner, spender))
        }

        fn transfer(ref self: ContractState, recipient: ContractAddress, amount: felt252) {
            let sender = get_caller_address();
            self._transfer(sender, recipient, amount);
        }

        fn transfer_from(
            ref self: ContractState,
            sender: ContractAddress,
            recipient: ContractAddress,
            amount: felt252
        ) {
            let caller = get_caller_address();
            self.spend_allowance(sender, caller, amount);
            self._transfer(sender, recipient, amount);
        }

        fn approve(ref self: ContractState, spender: ContractAddress, amount: felt252) {
            let caller = get_caller_address();
            self.approve_helper(caller, spender, amount);
        }

        fn increase_allowance(
            ref self: ContractState, spender: ContractAddress, added_value: felt252
        ) {
            let caller = get_caller_address();
            self
                .approve_helper(
                    caller, spender, self.allowances.read((caller, spender)) + added_value
                );
        }

        fn decrease_allowance(
            ref self: ContractState, spender: ContractAddress, subtracted_value: felt252
        ) {
            let caller = get_caller_address();
            self
                .approve_helper(
                    caller, spender, self.allowances.read((caller, spender)) - subtracted_value
                );
        }
    }

    #[generate_trait]
    impl InternalImpl of InternalTrait {
        fn _transfer(
            ref self: ContractState,
            sender: ContractAddress,
            recipient: ContractAddress,
            amount: felt252
        ) {
            assert(!sender.is_zero(), Errors::TRANSFER_FROM_ZERO);
            assert(!recipient.is_zero(), Errors::TRANSFER_TO_ZERO);
            self.balances.write(sender, self.balances.read(sender) - amount);
            self.balances.write(recipient, self.balances.read(recipient) + amount);
            self.emit(Transfer { from: sender, to: recipient, value: amount });
        }

        fn spend_allowance(
            ref self: ContractState,
            owner: ContractAddress,
            spender: ContractAddress,
            amount: felt252
        ) {
            let allowance = self.allowances.read((owner, spender));
            self.allowances.write((owner, spender), allowance - amount);
        }

        fn approve_helper(
            ref self: ContractState,
            owner: ContractAddress,
            spender: ContractAddress,
            amount: felt252
        ) {
            assert(!spender.is_zero(), Errors::APPROVE_TO_ZERO);
            self.allowances.write((owner, spender), amount);
            self.emit(Approval { owner, spender, value: amount });
        }

        fn mint(ref self: ContractState, recipient: ContractAddress, amount: felt252) {
            assert(!recipient.is_zero(), Errors::MINT_TO_ZERO);
            let supply = self.total_supply.read() + amount; // What can go wrong here?
            self.total_supply.write(supply);
            let balance = self.balances.read(recipient) + amount;
            self.balances.write(recipient, amount);
            self
                .emit(
                    Event::Transfer(
                        Transfer {
                            from: contract_address_const::<0>(), to: recipient, value: amount
                        }
                    )
                );
        }
    }
}





```

In Starknet, function names should be written in _snake_case_. This is not the case in Solidity, where function names
are written in _camelCase_. The Starknet ERC20 interface is therefore slightly different from the Solidity ERC20
interface.

Here's an implementation of the ERC20 interface in Cairo:

```rust
use starknet::ContractAddress;


#[starknet::interface]
trait IERC20<TContractState> {
    fn get_name(self: @TContractState) -> felt252;
    fn get_symbol(self: @TContractState) -> felt252;
    fn get_decimals(self: @TContractState) -> u8;
    fn get_total_supply(self: @TContractState) -> felt252;
    fn balance_of(self: @TContractState, account: ContractAddress) -> felt252;
    fn allowance(
        self: @TContractState, owner: ContractAddress, spender: ContractAddress
    ) -> felt252;
    fn transfer(ref self: TContractState, recipient: ContractAddress, amount: felt252);
    fn transfer_from(
        ref self: TContractState,
        sender: ContractAddress,
        recipient: ContractAddress,
        amount: felt252
    );
    fn approve(ref self: TContractState, spender: ContractAddress, amount: felt252);
    fn increase_allowance(ref self: TContractState, spender: ContractAddress, added_value: felt252);
    fn decrease_allowance(
        ref self: TContractState, spender: ContractAddress, subtracted_value: felt252
    );
}



#[starknet::contract]
mod erc20 {
    use zeroable::Zeroable;
    use starknet::get_caller_address;
    use starknet::contract_address_const;
    use starknet::ContractAddress;

    #[storage]
    struct Storage {
        name: felt252,
        symbol: felt252,
        decimals: u8,
        total_supply: felt252,
        balances: LegacyMap::<ContractAddress, felt252>,
        allowances: LegacyMap::<(ContractAddress, ContractAddress), felt252>,
    }

    #[event]
    #[derive(Drop, starknet::Event)]
    enum Event {
        Transfer: Transfer,
        Approval: Approval,
    }
    #[derive(Drop, starknet::Event)]
    struct Transfer {
        from: ContractAddress,
        to: ContractAddress,
        value: felt252,
    }
    #[derive(Drop, starknet::Event)]
    struct Approval {
        owner: ContractAddress,
        spender: ContractAddress,
        value: felt252,
    }

    mod Errors {
        const APPROVE_FROM_ZERO: felt252 = 'ERC20: approve from 0';
        const APPROVE_TO_ZERO: felt252 = 'ERC20: approve to 0';
        const TRANSFER_FROM_ZERO: felt252 = 'ERC20: transfer from 0';
        const TRANSFER_TO_ZERO: felt252 = 'ERC20: transfer to 0';
        const BURN_FROM_ZERO: felt252 = 'ERC20: burn from 0';
        const MINT_TO_ZERO: felt252 = 'ERC20: mint to 0';
    }

    #[constructor]
    fn constructor(
        ref self: ContractState,
        recipient: ContractAddress,
        name: felt252,
        decimals: u8,
        initial_supply: felt252,
        symbol: felt252
    ) {
        self.name.write(name);
        self.symbol.write(symbol);
        self.decimals.write(decimals);
        self.mint(recipient, initial_supply);
    }

    #[abi(embed_v0)]
    impl IERC20Impl of super::IERC20<ContractState> {
        fn get_name(self: @ContractState) -> felt252 {
            self.name.read()
        }

        fn get_symbol(self: @ContractState) -> felt252 {
            self.symbol.read()
        }

        fn get_decimals(self: @ContractState) -> u8 {
            self.decimals.read()
        }

        fn get_total_supply(self: @ContractState) -> felt252 {
            self.total_supply.read()
        }

        fn balance_of(self: @ContractState, account: ContractAddress) -> felt252 {
            self.balances.read(account)
        }

        fn allowance(
            self: @ContractState, owner: ContractAddress, spender: ContractAddress
        ) -> felt252 {
            self.allowances.read((owner, spender))
        }

        fn transfer(ref self: ContractState, recipient: ContractAddress, amount: felt252) {
            let sender = get_caller_address();
            self._transfer(sender, recipient, amount);
        }

        fn transfer_from(
            ref self: ContractState,
            sender: ContractAddress,
            recipient: ContractAddress,
            amount: felt252
        ) {
            let caller = get_caller_address();
            self.spend_allowance(sender, caller, amount);
            self._transfer(sender, recipient, amount);
        }

        fn approve(ref self: ContractState, spender: ContractAddress, amount: felt252) {
            let caller = get_caller_address();
            self.approve_helper(caller, spender, amount);
        }

        fn increase_allowance(
            ref self: ContractState, spender: ContractAddress, added_value: felt252
        ) {
            let caller = get_caller_address();
            self
                .approve_helper(
                    caller, spender, self.allowances.read((caller, spender)) + added_value
                );
        }

        fn decrease_allowance(
            ref self: ContractState, spender: ContractAddress, subtracted_value: felt252
        ) {
            let caller = get_caller_address();
            self
                .approve_helper(
                    caller, spender, self.allowances.read((caller, spender)) - subtracted_value
                );
        }
    }

    #[generate_trait]
    impl InternalImpl of InternalTrait {
        fn _transfer(
            ref self: ContractState,
            sender: ContractAddress,
            recipient: ContractAddress,
            amount: felt252
        ) {
            assert(!sender.is_zero(), Errors::TRANSFER_FROM_ZERO);
            assert(!recipient.is_zero(), Errors::TRANSFER_TO_ZERO);
            self.balances.write(sender, self.balances.read(sender) - amount);
            self.balances.write(recipient, self.balances.read(recipient) + amount);
            self.emit(Transfer { from: sender, to: recipient, value: amount });
        }

        fn spend_allowance(
            ref self: ContractState,
            owner: ContractAddress,
            spender: ContractAddress,
            amount: felt252
        ) {
            let allowance = self.allowances.read((owner, spender));
            self.allowances.write((owner, spender), allowance - amount);
        }

        fn approve_helper(
            ref self: ContractState,
            owner: ContractAddress,
            spender: ContractAddress,
            amount: felt252
        ) {
            assert(!spender.is_zero(), Errors::APPROVE_TO_ZERO);
            self.allowances.write((owner, spender), amount);
            self.emit(Approval { owner, spender, value: amount });
        }

        fn mint(ref self: ContractState, recipient: ContractAddress, amount: felt252) {
            assert(!recipient.is_zero(), Errors::MINT_TO_ZERO);
            let supply = self.total_supply.read() + amount; // What can go wrong here?
            self.total_supply.write(supply);
            let balance = self.balances.read(recipient) + amount;
            self.balances.write(recipient, amount);
            self
                .emit(
                    Event::Transfer(
                        Transfer {
                            from: contract_address_const::<0>(), to: recipient, value: amount
                        }
                    )
                );
        }
    }
}





```

There's several other implementations, such as the
[Open Zeppelin](https://docs.openzeppelin.com/contracts-cairo/0.7.0/erc20) or the
[Cairo By Example](https://cairo-by-example.com/examples/erc20/) ones.


# Arrays

Arrays are collections of elements of the same type.
The possible operations on arrays are defined with the `array::ArrayTrait` of the corelib:

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
meaning that the same input will always produce the same output.

The two hash functions provided by the Cairo library are `Poseidon` and `Pedersen`. Pedersen hashes were used in the
past (but still used in some scenario for backward compatibility) while Poseidon hashes are the standard nowadays since
they were designed to be very efficient for Zero Knowledge proof systems.

In Cairo it's possible to hash all the types that can be converted to `felt252` since they implement natively the `Hash`
trait. It's also possible to hash more complex types like structs by deriving the Hash trait with the attribute
`#[derive(Hash)]` but only if all the struct's fields are themselves hashable.

You first need to initialize a hash state with the `new` method of the `HashStateTrait` and then you can update it with
the `update` method. You can accumulate multiple updates. Then, the `finalize` method returns the final hash value as a
`felt252`.

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


#[cfg(test)]
mod tests {
    use super::{HashTraits, IHashTraitDispatcher, IHashTraitDispatcherTrait};

    use core::hash::{HashStateTrait, HashStateExTrait};
    use core::{pedersen::PedersenTrait, poseidon::PoseidonTrait};
    use starknet::{deploy_syscall};

    use debug::PrintTrait;

    fn deploy() -> IHashTraitDispatcher {
        let mut calldata = ArrayTrait::new();
        let (address, _) = deploy_syscall(
            HashTraits::TEST_CLASS_HASH.try_into().unwrap(), 0, calldata.span(), false
        )
            .unwrap();
        IHashTraitDispatcher { contract_address: address }
    }


    #[test]
    #[available_gas(20000000)]
    fn test_pedersen_hash() {
        let mut contract = deploy();

        let id = 0x1;
        let username = 'A.stark';
        let password = 'password.stark';
        let test_hash = contract.save_user_with_pedersen(id, username, password);

        assert(
            test_hash == 0x6da4b4d0489989f5483d179643dafb3405b0e3b883a6c8efe5beb824ba9055a,
            'Incorrect hash output'
        );
    }

    #[test]
    #[available_gas(20000000)]
    fn test_poseidon_hash() {
        let mut contract = deploy();

        let id = 0x1;
        let username = 'A.stark';
        let password = 'password.stark';

        let test_hash = contract.save_user_with_poseidon(id, username, password);

        test_hash.print();

        assert(
            test_hash == 0x4d165e1d398ae4864854518d3c58c3d7a21ed9c1f8f3618fbb0031d208aab7b,
            'Incorrect hash output'
        );
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

Here's the most minimal contract you can write in Cairo:

```rust
#[starknet::contract]
mod Contract {
    #[storage]
    struct Storage {}
}


```

Storage is a struct annoted with `#[storage]`. Every contract must have one and only one storage.
It's a key-value store, where each key will be mapped to a storage address of the contract's storage space.

You can define [storage variables](./variables.md#storage-variables) in your contract, and then use them to store and retrieve data.

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

> Actually these two contracts have the same underlying sierra program.
> From the compiler's perspective, the storage variables don't exist until they are used.

You can also read about [storing custom types](./storing-custom-types.md)


# Hash Solidity Compatible

This contract demonstrates Keccak hashing in Cairo to match Solidity's keccak256. While both use Keccak, their endianness differs: Cairo is little-endian, Solidity big-endian. The contract achieves compatibility by hashing in big-endian using `keccak_u256s_be_inputs`, and reversing the bytes of the result with `u128_byte_reverse`.

For example:

```rust
#[starknet::interface]
trait ISolidityHashExample<TContractState> {
    fn hash_data(ref self: TContractState, input_data: Span<u256>) -> u256;
}


#[starknet::contract]
mod SolidityHashExample {
    use keccak::{keccak_u256s_be_inputs};
    use array::Span;

    #[storage]
    struct Storage {}

    #[abi(embed_v0)]
    impl SolidityHashExample of super::ISolidityHashExample<ContractState> {
        fn hash_data(ref self: ContractState, input_data: Span<u256>) -> u256 {
            let hashed = keccak_u256s_be_inputs(input_data);

            // Split the hashed value into two 128-bit segments
            let low: u128 = hashed.low;
            let high: u128 = hashed.high;

            // Reverse each 128-bit segment
            let reversed_low = integer::u128_byte_reverse(low);
            let reversed_high = integer::u128_byte_reverse(high);

            // Reverse merge the reversed segments back into a u256 value
            let compatible_hash = u256 { low: reversed_high, high: reversed_low };

            compatible_hash
        }
    }
}



```


# Contract interfaces and Traits generation

Contract interfaces define the structure and behavior of a contract, serving as the contract's public ABI. They list all
the function signatures that a contract exposes. For a detailed explanation of interfaces, you can refer to the
[Cairo Book](https://book.cairo-lang.org/ch99-01-02-a-simple-contract.html).

In cairo, to specify the interface you need to define a trait annotated with `#[starknet::interface]` and then implement
that trait in the contract.

When a function needs to access the contract state, it must have a `self` parameter of type `ContractState`. This
implies that the corresponding function signature in the interface trait must also take a `TContractState` type as a
parameter. It's important to note that every function in the contract interface must have this `self` parameter of type
`TContractState`.

You can use the `#[generate_trait]` attribute to implicitly generate the trait for a specific implementation block. This
attribute automatically generates a trait with the same functions as the ones in the implemented block, replacing the
`self` parameter with a generic `TContractState` parameter. However, you will need to annotate the block with the
`#[abi(per_item)]` attribute, and each function with the appropriate attribute depending on whether it's an external
function, a constructor or a l1 handler.

In summary, there's two ways to handle interfaces:

- Explicitly, by defining a trait annoted with `#[starknet::interface]`
- Implicitly, by using `#[generate_trait]` combined with the #[abi(per_item)]` attributes, and annotating each function
  inside the implementation block with the appropriate attribute.

## Explicit interface

```rust
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


```

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

At the protocol level, the Starknet Operating System (OS) is the program that manages the whole Starknet network.

Some of the OS functionalities are exposed to smart contracts through the use of syscalls (system calls). Syscalls can be used to get information about the state of the Starknet network, to interact with/deploy contracts, emit events, send messages, and perform other low-level operations.

Syscalls return a `SyscallResult` which is either `Sucess` of `Failure`, allowing the contract to handle errors.

Here's the available syscalls:

- [get_block_hash](#get_block_hash)
- [get_execution_info](#get_execution_info)
- [call_contract](#call_contract)
- [deploy](#deploy)
- [emit_event](#emit_event)
- [library_call](#library_call)
- [send_message_to_L1](#send_message_to_L1)
- [replace_class](#replace_class)
- [storage_read](#storage_read)
- [storage_write](#storage_write)

#### get_block_hash

```rust
fn get_block_hash_syscall(block_number: u64) -> SyscallResult<felt252>

```

Get the hash of the block number `block_number`.

Only within the range `[first_v0_12_0_block, current_block - 10]`.

#### get_execution_info

```rust
fn get_execution_info_syscall() -> SyscallResult<Box<starknet::info::ExecutionInfo>>

```

Get information about the current execution context.
The returned `ExecutionInfo` is defined as :

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

Call a contract at `address` with the given `entry_point_selector` and `calldata`.
Failure can't be caught for this syscall, if the call fails, the whole transaction will revert.

This is not the recommended way to call a contract. Instead, use the dispatcher generated from the contract interface as shown in the [Calling other contracts](../interacting/calling_other_contracts.md).

#### deploy

```rust
fn deploy_syscall(
class_hash: ClassHash,
contract_address_salt: felt252,
calldata: Span<felt252>,
deploy_from_zero: bool,
) -> SyscallResult<(ContractAddress, Span::<felt252>)>

```

Deploy a new contract of the predeclared class `class_hash` with `calldata`.
The success result is a tuple containing the deployed contract address and the return value of the constructor.

`contract_address_salt` and `deploy_from_zero` are used to compute the contract address.

Example of the usage of the `deploy` syscall from the [Factory pattern](../interacting/factory.md):

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

Emit an event with the given `keys` and `data`.

Example of the usage of the `emit_event` syscall from the [Events](../basics/events.md) chapter:

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

Call the function `function_selector` of the class `class_hash` with `calldata`.
This is analogous to a delegate call in Ethereum, but only a single class is called.

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

Replace the class of the calling contract with the class `class_hash`.

This is used for contract upgrades. Here's an example from the [Upgradeable Contract](../../ch01/upgradeable_contract.md):

```rust

use starknet::class_hash::ClassHash;

#[starknet::interface]
trait IUpgradeableContract<TContractState> {
    fn upgrade(ref self: TContractState, impl_hash: ClassHash);
    fn version(self: @TContractState) -> u8;
}

#[starknet::contract]
mod UpgradeableContract_V0 {
    use starknet::class_hash::ClassHash;
    use starknet::SyscallResultTrait;

    #[storage]
    struct Storage {}


    #[event]
    #[derive(Drop, starknet::Event)]
    enum Event {
        Upgraded: Upgraded
    }

    #[derive(Drop, starknet::Event)]
    struct Upgraded {
        implementation: ClassHash
    }

    #[abi(embed_v0)]
    impl UpgradeableContract of super::IUpgradeableContract<ContractState> {

        fn upgrade(ref self: ContractState, impl_hash: ClassHash) {
            assert(!impl_hash.is_zero(), 'Class hash cannot be zero');
            starknet::replace_class_syscall(impl_hash).unwrap_syscall();
            self.emit(Event::Upgraded(Upgraded { implementation: impl_hash }))
        }


        fn version(self: @ContractState) -> u8 {
            0
        }
    }
}





```

The new class code will only be used for future calls to the contract.
The current transaction containing the `replace_class` syscall will continue to use the old class code. (You can explicitly use the new class code by calling `call_contract` after the `replace_class` syscall in the same transaction)

#### storage_read

```rust
fn storage_read_syscall(
address_domain: u32, address: StorageAddress,
) -> SyscallResult<felt252>

```

This low-level syscall is used to get the value in the storage of a specific key at `address` in the `address_domain`.

`address_domain` is used to distinguish between data availability modes.
Currently, only mode `ONCHAIN` (`0`) is supported.

#### storage_write

```rust
fn storage_write_syscall(
    address_domain: u32, address: StorageAddress, value: felt252
) -> SyscallResult<()>
```

Similar to `storage_read`, this low-level syscall is used to write the value `value` in the storage of a specific key at `address` in the `address_domain`.

## Documentation

Syscalls are defined in [`starknet::syscall`](https://github.com/starkware-libs/cairo/blob/ec14a5e2c484190ff40811c973a72a53739cedb7/corelib/src/starknet/syscalls.cairo)

You can also read the [official documentation page](https://docs.starknet.io/documentation/architecture_and_concepts/Smart_Contracts/system-calls-cairo1/) for more details.


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


# List

By default, there is no list type supported in Cairo, but you can use Alexandria. You can refer to the [Alexandria documentation](https://github.com/keep-starknet-strange/alexandria/tree/main/src/storage) for more details.

## What is `List`?

An ordered sequence of values that can be used in Starknet storage:

cairo #[storage]
stuct Storage {
amounts: List<u128>
}

````

### Interface

```rust
trait ListTrait<T> {
  fn len(self: @List<T>) -> u32;
  fn is_empty(self: @List<T>) -> bool;
  fn append(ref self: List<T>, value: T) -> u32;
  fn get(self: @List<T>, index: u32) -> Option<T>;
  fn set(ref self: List<T>, index: u32, value: T);
  fn pop_front(ref self: List<T>) -> Option<T>;
  fn array(self: @List<T>) -> Array<T>;
}
````

`List` also implements `IndexView` so you can use the familiar bracket notation to access its members:

```rust
let second = self.amounts.read()[1];

```

Note that unlike `get`, using this bracket notation panics when accessing an out of bounds index.

### Support for custom types

`List` supports most of the corelib types out of the box. If you want to store a your own custom type in a `List`, it has to implement the `Store` trait. You can have the compiler derive it for you using the `#[derive(starknet::Store)]` attribute.

### Caveats

There are two idiosyncacies you should be aware of when using `List`

1. The `append` operation costs 2 storage writes - one for the value itself and another one for updating the List's length
2. Due to a compiler limitation, it is not possible to use mutating operations with a single inline statement. For example, `self.amounts.read().append(42);` will not work. You have to do it in 2 steps:

```rust
let mut amounts = self.amounts.read();
amounts.append(42);
```

### Dependencies

Update your project dependencies by in the `Scarb.toml` file:

```rust
[dependencies]
(...)
alexandria_storage = { git = "https://github.com/keep-starknet-strange/alexandria.git" }

```

For example, let's use `List` to create a contract that tracks a list of amounts and tasks:

```rust
#[starknet::interface]
trait IListExample<TContractState> {
    fn add_in_amount(ref self: TContractState, number: u128);
    fn add_in_task(ref self: TContractState, description: felt252, status: felt252);
    fn is_empty_list(self: @TContractState) -> bool;
    fn list_length(self: @TContractState) -> u32;
    fn get_from_index(self: @TContractState, index: u32) -> u128;
    fn set_from_index(ref self: TContractState, index: u32, number: u128);
    fn pop_front_list(ref self: TContractState);
    fn array_conversion(self: @TContractState) -> Array<u128>;
}

#[starknet::contract]
mod ListExample {
    use alexandria_storage::list::{List, ListTrait};

    #[storage]
    struct Storage {
        amount: List<u128>,
        tasks: List<Task>
    }

    #[derive(Copy, Drop, Serde, starknet::Store)]
    struct Task {
        description: felt252,
        status: felt252
    }


    #[abi(embed_v0)]
    impl ListExample of super::IListExample<ContractState> {
        fn add_in_amount(ref self: ContractState, number: u128) {
            let mut current_amount_list = self.amount.read();
            current_amount_list.append(number);
        }

        fn add_in_task(ref self: ContractState, description: felt252, status: felt252) {
            let new_task = Task { description: description, status: status };
            let mut current_tasks_list = self.tasks.read();
            current_tasks_list.append(new_task);
        }

        fn is_empty_list(self: @ContractState) -> bool {
            let mut current_amount_list = self.amount.read();
            current_amount_list.is_empty()
        }

        fn list_length(self: @ContractState) -> u32 {
            let mut current_amount_list = self.amount.read();
            current_amount_list.len()
        }

        fn get_from_index(self: @ContractState, index: u32) -> u128 {
            self.amount.read()[index]
        }

        fn set_from_index(ref self: ContractState, index: u32, number: u128) {
            let mut current_amount_list = self.amount.read();
            current_amount_list.set(index, number);
        }

        fn pop_front_list(ref self: ContractState) {
            let mut current_amount_list = self.amount.read();
            current_amount_list.pop_front();
        }

        fn array_conversion(self: @ContractState) -> Array<u128> {
            let mut current_amount_list = self.amount.read();
            current_amount_list.array()
        }
    }
}


```


# Errors

Errors can be used to handle validation and other conditions that may occur during the execution of a smart contract. If
an error is thrown during the execution of a smart contract call, the execution is stopped and any changes made during
the transaction are reverted.

To throw an error, use the `assert` or `panic` functions:

- `assert` is used to validate conditions. If the check fails, an error is thrown along with a specified value, often a
  message. It's similar to the `require` statement in Solidity.

- `panic` immediately halt the execution with the given error value. It should be used when the condition to check is
  complex and for internal errors. It's similar to the `revert` statement in Solidity. (Use `panic_with_felt252` to be
  able to directly pass a felt252 as the error value)

Here's a simple example that demonstrates the use of these functions:

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

## Vault example

Here's another example that demonstrates the use of errors in a more complex contract:

```rust
mod VaultErrors {
    const INSUFFICIENT_BALANCE: felt252 = 'insufficient_balance';
// you can define more errors here
}

#[starknet::interface]
trait IVaultErrorsExample<TContractState> {
    fn deposit(ref self: TContractState, amount: u256);
    fn withdraw(ref self: TContractState, amount: u256);
}

#[starknet::contract]
mod VaultErrorsExample {
    use super::VaultErrors;

    #[storage]
    struct Storage {
        balance: u256,
    }

    #[abi(embed_v0)]
    impl VaultErrorsExample of super::IVaultErrorsExample<ContractState> {
        fn deposit(ref self: ContractState, amount: u256) {
            let mut balance = self.balance.read();
            balance = balance + amount;
            self.balance.write(balance);
        }

        fn withdraw(ref self: ContractState, amount: u256) {
            let mut balance = self.balance.read();

            assert(balance >= amount, VaultErrors::INSUFFICIENT_BALANCE);

            // Or using panic:
            if (balance >= amount) {
                panic_with_felt252(VaultErrors::INSUFFICIENT_BALANCE);
            }

            let balance = balance - amount;

            self.balance.write(balance);
        }
    }
}



```


# Factory Pattern

The factory pattern is a well known pattern in object oriented programming. It provides an abstraction on how to
instantiate a class.

In the case of smart contracts, we can use this pattern by defining a factory contract that have the sole responsibility
of creating and managing other contracts.

## Class hash and contract instance

In Starknet, there's a separation between contract's classes and instances. A contract class serves as a blueprint,
defined by the underling Cairo bytecode, contract's entrypoints, ABI and Sierra program hash. The contract class is
identified by a class hash. When you want to add a new class to the network, you first need to declare it.

When deploying a contract, you need to specify the class hash of the contract you want to deploy. Each instance of a
contract has their own storage regardless of the class hash.

Using the factory pattern, we can deploy multiple instances of the same contract class and handle upgrades easily.

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
and `create_counter_at` functions.

The `SimpleCounter` class hash is stored inside the factory, and can be upgraded with the `update_counter_class_hash`
function which allows to reuse the same factory contract when the `SimpleCounter` contract is upgraded.

This minimal example lacks several useful features such as access control, tracking of deployed contracts, events, ...


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

On Starknet, complex values (e.g., tuples or structs), are stored in a continuous segment starting from the address of the storage variable. There is a 256 field elements limitation to the maximal size of a complex storage value, meaning that to store arrays of more than 255 elements in storage, we would need to split it into segments of size `n <= 255` and store these segments in multiple storage addresses. There is currently no native support for storing arrays in Cairo, so you will need to write your own implementation of the `Store` trait for the type of array you wish to store.

> Note: While storing arrays in storage is possible, it is not always recommended, as the read and write operations can get very costly. For example, reading an array of size `n` requires `n` storage reads, and writing to an array of size `n` requires `n` storage writes. If you only need to access a single element of the array at a time, it is recommended to use a `LegacyMap` and store the length in another variable instead.

The following example demonstrates how to write a simple implementation of the `StorageAccess` trait for the `Array<felt252>` type, allowing us to store arrays of up to 255 `felt252` elements.

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
generate a hash function for the struct that can be used to represent the struct as a key in a `LegacyMap`.

Consider the following example in which we would like to use an object of type `Pet` as a key in a `LegacyMap`. The
`Pet` struct has three fields: `name`, `age` and `owner`. We consider that the combination of these three fields
uniquely identifies a pet.

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
- Functions that are only accessible internally and can only be called by other functions in the contract.

These functions are also typically divided into two different implementations blocks. The first `impl` block for
externally accessible functions is explicitly annotated with an `#[abi(embed_v0)]` attribute. This indicates that all
the functions inside this block can be called either as a transaction or as a view function. The second `impl` block for
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
  `self: @ContractState`.

Read-only functions, also called view functions, can be directly called without making a transaction. You can interact
with them directly through a RPC node to read the contract's state, and they're free to call! External functions, that
modify the contract's state, on the other side can only be called by making a transaction.

Internal functions can't be called externally, but the same principle applies regarding state mutability.

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


```rust
use starknet::ContractAddress;

#[derive(Copy, Drop)]
struct ERC721Receiver {
    contract_address: ContractAddress
}

trait ERC721ReceiverTrait {
    fn on_erc721_received(
        self: @ERC721Receiver,
        operator: ContractAddress,
        from: ContractAddress,
        token_id: u256,
        data: Span<felt252>
    ) -> felt252;
}

impl ERC721ReceiverImpl of ERC721ReceiverTrait {
    fn on_erc721_received(
        self: @ERC721Receiver,
        operator: ContractAddress,
        from: ContractAddress,
        token_id: u256,
        data: Span<felt252>
    ) -> felt252 {
        ''
    }
}
```


# Simple Counter

This is a simple counter contract.

Here's how it works:

- The contract has a state variable called 'counter' that is initialized to 0.

- When a user calls 'increment', the contract increments the counter by 1.

- When a user calls 'decrement', the contract decrements the counter by 1.

```rust
#[starknet::interface]
trait ISimpleCounter<TContractState> {
    fn get_current_count(self: @TContractState) -> u128;
    fn increment(ref self: TContractState);
    fn decrement(ref self: TContractState);
}

#[starknet::contract]
mod SimpleCounter {
    #[storage]
    struct Storage {
        // Counter variable
        counter: u128,
    }

    #[constructor]
    fn constructor(ref self: ContractState, init_value: u128) {
        // Store initial value
        self.counter.write(init_value);
    }

    #[abi(embed_v0)]
    impl SimpleCounter of super::ISimpleCounter<ContractState> {
        fn get_current_count(self: @ContractState) -> u128 {
            return self.counter.read();
        }

        fn increment(ref self: ContractState) {
            // Store counter value + 1
            let counter = self.counter.read() + 1;
            self.counter.write(counter);
        }
        fn decrement(ref self: ContractState) {
            // Store counter value - 1
            let counter = self.counter.read() - 1;
            self.counter.write(counter);
        }
    }
}



```


# Felt252

Felt252 is a fundamental data type in Cairo from which all other data types are derived. Felt252 can also be used to
store short-string representations with a maximum length of 31 characters.

For example:

```rust
fn felt() {

    let felt: felt252 = 100;
    let felt_as_str = 'Hello Starknet!';

    let felt = felt + felt_as_str;

}



```


# Simple Defi Vault

This is the Cairo adaptation of the [Solidity by example Vault](https://solidity-by-example.org/defi/vault/). Here's how
it works:

- When a user deposits a token, the contract calculates the amount of shares to mint.

- When a user withdraws, the contract burns their shares, calculates the yield, and withdraw both the yield and the
  initial amount of token deposited.

```rust
use starknet::{ContractAddress};

// In order to make contract calls within our Vault,
// we need to have the interface of the remote ERC20 contract defined to import the Dispatcher.
#[starknet::interface]
trait IERC20<TContractState> {
    fn name(self: @TContractState) -> felt252;
    fn symbol(self: @TContractState) -> felt252;
    fn decimals(self: @TContractState) -> u8;
    fn total_supply(self: @TContractState) -> u256;
    fn balance_of(self: @TContractState, account: ContractAddress) -> u256;
    fn allowance(self: @TContractState, owner: ContractAddress, spender: ContractAddress) -> u256;
    fn transfer(ref self: TContractState, recipient: ContractAddress, amount: u256) -> bool;
    fn transfer_from(
        ref self: TContractState, sender: ContractAddress, recipient: ContractAddress, amount: u256
    ) -> bool;
    fn approve(ref self: TContractState, spender: ContractAddress, amount: u256) -> bool;
}

#[starknet::interface]
trait ISimpleVault<TContractState> {
    fn deposit(ref self: TContractState, amount: u256);
    fn withdraw(ref self: TContractState, shares: u256);
}

#[starknet::contract]
mod SimpleVault {
    use super::{IERC20Dispatcher, IERC20DispatcherTrait};
    use starknet::{ContractAddress, get_caller_address, get_contract_address};
    #[storage]
    struct Storage {
        token: IERC20Dispatcher,
        total_supply: u256,
        balance_of: LegacyMap<ContractAddress, u256>
    }

    #[constructor]
    fn constructor(ref self: ContractState, token: ContractAddress) {
        self.token.write(IERC20Dispatcher { contract_address: token });
    }

    #[generate_trait]
    impl PrivateFunctions of PrivateFunctionsTrait {
        fn _mint(ref self: ContractState, to: ContractAddress, shares: u256) {
            self.total_supply.write(self.total_supply.read() + shares);
            self.balance_of.write(to, self.balance_of.read(to) + shares);
        }

        fn _burn(ref self: ContractState, from: ContractAddress, shares: u256) {
            self.total_supply.write(self.total_supply.read() - shares);
            self.balance_of.write(from, self.balance_of.read(from) - shares);
        }
    }

    #[abi(embed_v0)]
    impl SimpleVault of super::ISimpleVault<ContractState> {
        fn deposit(ref self: ContractState, amount: u256) {
            // a = amount
            // B = balance of token before deposit
            // T = total supply
            // s = shares to mint
            //
            // (T + s) / T = (a + B) / B
            //
            // s = aT / B
            let caller = get_caller_address();
            let this = get_contract_address();

            let mut shares = 0;
            if self.total_supply.read() == 0 {
                shares = amount;
            } else {
                let balance = self.token.read().balance_of(this);
                shares = (amount * self.total_supply.read()) / balance;
            }

            PrivateFunctions::_mint(ref self, caller, shares);
            self.token.read().transfer_from(caller, this, amount);
        }

        fn withdraw(ref self: ContractState, shares: u256) {
            // a = amount
            // B = balance of token before withdraw
            // T = total supply
            // s = shares to burn
            //
            // (T - s) / T = (B - a) / B
            //
            // a = sB / T
            let caller = get_caller_address();
            let this = get_contract_address();

            let balance = self.token.read().balance_of(this);
            let amount = (shares * balance) / self.total_supply.read();
            PrivateFunctions::_burn(ref self, caller, shares);
            self.token.read().transfer(caller, amount);
        }
    }
}




```


# Components How-To

Components are like modular addons that can be snapped into contracts to add reusable logic, storage, and events.
They are used to separate the core logic from common functionalities, simplifying the contract's code and making it easier to read and maintain.
It also reduces the risk of bugs and vulnerabilities by using well-tested components.

Key characteristics:

- Modularity: Easily pluggable into multiple contracts.
- Reusable Logic: Encapsulates specific functionalities.
- Not Standalone: Cannot be declared or deployed independently.

## How to create a component

The following example shows a simple `Switchable` component that can be used to add a switch that can be either on or off.
It contains a storage variable `switchable_value`, a function `switch` and an event `Switch`.

> It is a good practice to prefix the component storage variables with the component name to [avoid collisions](./collisions.md).

```rust

#[starknet::interface]

trait ISwitchable<TContractState> {
    fn is_on(self: @TContractState) -> bool;
    fn switch(ref self: TContractState);
}


#[starknet::component]
mod switchable_component {
    #[storage]
    struct Storage {
        switchable_value: bool,
    }

    #[derive(Drop, starknet::Event)]
    struct SwitchEvent {}

    #[event]
    #[derive(Drop, starknet::Event)]
    enum Event {
        SwitchEvent: SwitchEvent,
    }

    #[embeddable_as(Switchable)]
    impl SwitchableImpl<
        TContractState, +HasComponent<TContractState>
    > of super::ISwitchable<ComponentState<TContractState>> {
        fn is_on(self: @ComponentState<TContractState>) -> bool {
            self.switchable_value.read()
        }

        fn switch(ref self: ComponentState<TContractState>) {
            self.switchable_value.write(!self.switchable_value.read());
            self.emit(Event::SwitchEvent(SwitchEvent {}));
        }
    }

    #[generate_trait]
    impl SwitchableInternalImpl<
        TContractState, +HasComponent<TContractState>
    > of SwitchableInternalTrait<TContractState> {
        fn _off(ref self: ComponentState<TContractState>) {
            self.switchable_value.write(false);
        }
    }
}





```

A component in itself is really similar to a contract, it _can_ also have:

- An interface defining entrypoints (`ISwitchableComponent<TContractState>`)
- A Storage struct
- Events
- Internal functions

It don't have a constructor, but you can create a `_init` internal function and call it from the contract's constructor. In the previous example, the `_off` function is used this way.

> It's currently not possible to use the same component multiple times in the same contract.
> This is a known limitation that may be lifted in the future.
>
> For now, you can view components as an implementation of a specific interface/feature (`Ownable`, `Upgradeable`, ... `~able`).
> This is why we called it `Switchable` and not `Switch`; The contract _is switchable_, not _has a switch_.

## How to use a component

Now that we have a component, we can use it in a contract.
The following contract incorporates the `Switchable` component:

```rust

#[starknet::contract]
mod SwitchContract {
    use components::switchable::switchable_component;

    component!(path: switchable_component, storage: switch, event: SwitchableEvent);

    #[abi(embed_v0)]
    impl SwitchableImpl = switchable_component::Switchable<ContractState>;
    impl SwitchableInternalImpl = switchable_component::SwitchableInternalImpl<ContractState>;

    #[storage]
    struct Storage {
        #[substorage(v0)]
        switch: switchable_component::Storage,
    }

    #[constructor]
    fn constructor(ref self: ContractState) {
        self.switch._off();
    }

    #[event]
    #[derive(Drop, starknet::Event)]
    enum Event {
        SwitchableEvent: switchable_component::Event,
    }
}


#[cfg(test)]
mod tests {
    use components::switchable::switchable_component::SwitchableInternalTrait;
    use components::switchable::ISwitchable;

    use core::starknet::storage::StorageMemberAccessTrait;
    use super::SwitchContract;

    fn STATE() -> SwitchContract::ContractState {
        SwitchContract::contract_state_for_testing()
    }

    #[test]
    #[available_gas(2000000)]
    fn test_init() {
        let state = STATE();
        assert(state.is_on() == false, 'The switch should be off');
    }

    #[test]
    #[available_gas(2000000)]
    fn test_switch() {
        let mut state = STATE();

        state.switch();
        assert(state.is_on() == true, 'The switch should be on');

        state.switch();
        assert(state.is_on() == false, 'The switch should be off');
    }

    #[test]
    #[available_gas(2000000)]
    fn test_value() {
        let mut state = STATE();
        assert(state.is_on() == state.switch.switchable_value.read(), 'Wrong value');

        state.switch.switch();
        assert(state.is_on() == state.switch.switchable_value.read(), 'Wrong value');
    }

    #[test]
    #[available_gas(2000000)]
    fn test_internal_off() {
        let mut state = STATE();

        state.switch._off();
        assert(state.is_on() == false, 'The switch should be off');

        state.switch();
        state.switch._off();
        assert(state.is_on() == false, 'The switch should be off');
    }
}


```

## Deep dive into components

You can find more in-depth information about components in the [Cairo book - Components](https://book.cairo-lang.org/ch99-01-05-00-components.html).


```rust
use starknet::ContractAddress;

#[starknet::interface] trait IERC721<TContractState> { fn get_name(self: @TContractState) -> felt252; fn
get_symbol(self: @TContractState) -> felt252; fn token_uri(self: @TContractState, token_id: u256) -> felt252; fn
balance_of(self: @TContractState, account: ContractAddress) -> u256; fn is_approved_for_all( self: @TContractState,
owner: ContractAddress, operator: ContractAddress ) -> bool;

    fn owner_of(self: @TContractState, token_id: u256) -> ContractAddress;
    fn get_approved(self: @TContractState, token_id: u256) -> ContractAddress;

    fn set_approval_for_all(ref self: TContractState, operator: ContractAddress, approved: bool);
    fn approve(ref self: TContractState, to: ContractAddress, token_id: u256);
    fn transfer_from(
        ref self: TContractState, from: ContractAddress, to: ContractAddress, token_id: u256
    );
    fn mint(ref self: TContractState, recipient: ContractAddress, token_id: u256);

}

#[starknet::contract] mod ERC721 { use starknet::get_caller_address; use starknet::contract_address_const; use
starknet::ContractAddress; use traits::Into; use zeroable::Zeroable; use traits::TryInto; use array::SpanTrait; use
array::ArrayTrait; use array::ArrayTCloneImpl; use option::OptionTrait;

    use super::super::erc721_receiver::ERC721Receiver;
    use super::super::erc721_receiver::ERC721ReceiverTrait;


    #[storage]
    struct Storage {
        name: felt252,
        symbol: felt252,
        owners: LegacyMap::<u256, ContractAddress>,
        balances: LegacyMap::<ContractAddress, u256>,
        token_approvals: LegacyMap::<u256, ContractAddress>,
        /// (owner, operator)
        operator_approvals: LegacyMap::<(ContractAddress, ContractAddress), bool>,
    }

    #[event]
    #[derive(Drop, starknet::Event)]
    enum Event {
        Approval: Approval,
        Transfer: Transfer,
        ApprovalForAll: ApprovalForAll,
    }
    #[derive(Drop, starknet::Event)]
    struct Approval {
        owner: ContractAddress,
        to: ContractAddress,
        token_id: u256
    }
    #[derive(Drop, starknet::Event)]
    struct Transfer {
        from: ContractAddress,
        to: ContractAddress,
        token_id: u256
    }
    #[derive(Drop, starknet::Event)]
    struct ApprovalForAll {
        owner: ContractAddress,
        operator: ContractAddress,
        approved: bool
    }

    #[constructor]
    fn constructor(ref self: ContractState, _name: felt252, _symbol: felt252) {
        self.name.write(_name);
        self.symbol.write(_symbol);
    }

    #[abi(embed_v0)]
    impl IERC721Impl of super::IERC721<ContractState> {
        fn get_name(self: @ContractState) -> felt252 {
            self.name.read()
        }

        fn get_symbol(self: @ContractState) -> felt252 {
            self.symbol.read()
        }

        fn balance_of(self: @ContractState, account: ContractAddress) -> u256 {
            assert(!account.is_zero(), 'ERC721: address zero');
            self.balances.read(account)
        }

        fn is_approved_for_all(
            self: @ContractState, owner: ContractAddress, operator: ContractAddress
        ) -> bool {
            self._is_approved_for_all(owner, operator)
        }

        fn token_uri(self: @ContractState, token_id: u256) -> felt252 {
            self._require_minted(token_id);
            let base_uri = self._base_uri();
            base_uri + token_id.try_into().unwrap()
        }

        fn owner_of(self: @ContractState, token_id: u256) -> ContractAddress {
            let owner = self._owner_of(token_id);
            assert(!owner.is_zero(), 'ERC721: invalid token ID');
            owner
        }

        fn get_approved(self: @ContractState, token_id: u256) -> ContractAddress {
            self._get_approved(token_id)
        }

        fn transfer_from(
            ref self: ContractState, from: ContractAddress, to: ContractAddress, token_id: u256
        ) {
            assert(
                self._is_approved_or_owner(get_caller_address(), token_id),
                'Caller is not owner or appvored'
            );
            self._transfer(from, to, token_id);
        }

        fn set_approval_for_all(
            ref self: ContractState, operator: ContractAddress, approved: bool
        ) {
            self._set_approval_for_all(get_caller_address(), operator, approved);
        }

        fn approve(ref self: ContractState, to: ContractAddress, token_id: u256) {
            let owner = self._owner_of(token_id);
            // Unlike Solidity, require is not supported, only assert can be used
            // The max length of error msg is 31 or there's an error
            assert(to != owner, 'Approval to current owner');
            assert(
                (get_caller_address() == owner)
                    || self._is_approved_for_all(owner, get_caller_address()),
                'Not token owner'
            );
            self._approve(to, token_id);
        }

        fn mint(ref self: ContractState, recipient: ContractAddress, token_id: u256) {
            self._safe_mint(recipient, token_id);
        }
    }

    #[external(v0)]
    fn safe_transfer_from(
        ref self: ContractState, from: ContractAddress, to: ContractAddress, token_id: u256
    ) {
        assert(
            self._is_approved_or_owner(get_caller_address(), token_id),
            'caller is not owner | approved'
        );
        self._safe_transfer(from, to, token_id, ArrayTrait::<felt252>::new().span());
    }


    /// looks like overloading is not supported currently
    // fn safe_transfer_from(
    //     ref self: ContractState,
    //     from: ContractAddress,
    //     to: ContractAddress,
    //     token_id: u256,
    //     _data: Span<felt252>
    // ) {
    //     assert(self._is_approved_or_owner(get_caller_address(), token_id),
    //         'caller is not owner | approved');
    //     self._safe_transfer(from, to, token_id, _data);
    // }

    // function _safeMint(address to, uint256 tokenId)

    #[generate_trait]
    impl StorageImpl of StorageTrait {
        fn _set_approval_for_all(
            ref self: ContractState,
            owner: ContractAddress,
            operator: ContractAddress,
            approved: bool
        ) {
            assert(owner != operator, 'ERC721: approve to caller');
            self.operator_approvals.write((owner, operator), approved);
            self.emit(Event::ApprovalForAll(ApprovalForAll { owner, operator, approved }));
        }

        fn _approve(ref self: ContractState, to: ContractAddress, token_id: u256) {
            self.token_approvals.write(token_id, to);
            self.emit(Event::Approval(Approval { owner: self._owner_of(token_id), to, token_id }));
        }

        fn _is_approved_for_all(
            self: @ContractState, owner: ContractAddress, operator: ContractAddress
        ) -> bool {
            self.operator_approvals.read((owner, operator))
        }

        fn _owner_of(self: @ContractState, token_id: u256) -> ContractAddress {
            self.owners.read(token_id)
        }

        fn _exists(self: @ContractState, token_id: u256) -> bool {
            !self._owner_of(token_id).is_zero()
        }

        fn _base_uri(self: @ContractState) -> felt252 {
            ''
        }

        fn _get_approved(self: @ContractState, token_id: u256) -> ContractAddress {
            self._require_minted(token_id);
            self.token_approvals.read(token_id)
        }

        fn _require_minted(self: @ContractState, token_id: u256) {
            assert(self._exists(token_id), 'ERC721: invalid token ID');
        }

        fn _is_approved_or_owner(
            self: @ContractState, spender: ContractAddress, token_id: u256
        ) -> bool {
            let owner = self.owners.read(token_id);
            (spender == owner)
                || self._is_approved_for_all(owner, spender)
                || (self._get_approved(token_id) == spender)
        }

        fn _transfer(
            ref self: ContractState, from: ContractAddress, to: ContractAddress, token_id: u256
        ) {
            assert(from == self._owner_of(token_id), 'Transfer from incorrect owner');
            assert(!to.is_zero(), 'ERC721: transfer to 0');

            self._before_token_transfer(from, to, token_id, 1.into());
            assert(from == self._owner_of(token_id), 'Transfer from incorrect owner');

            self.token_approvals.write(token_id, contract_address_const::<0>());

            self.balances.write(from, self.balances.read(from) - 1.into());
            self.balances.write(to, self.balances.read(to) + 1.into());

            self.owners.write(token_id, to);

            self.emit(Event::Transfer(Transfer { from, to, token_id }));

            self._after_token_transfer(from, to, token_id, 1.into());
        }

        fn _mint(ref self: ContractState, to: ContractAddress, token_id: u256) {
            assert(!to.is_zero(), 'ERC721: mint to 0');
            assert(!self._exists(token_id), 'ERC721: already minted');
            self._before_token_transfer(contract_address_const::<0>(), to, token_id, 1.into());
            assert(!self._exists(token_id), 'ERC721: already minted');

            self.balances.write(to, self.balances.read(to) + 1.into());
            self.owners.write(token_id, to);
            // contract_address_const::<0>() => means 0 address
            self
                .emit(
                    Event::Transfer(Transfer { from: contract_address_const::<0>(), to, token_id })
                );

            self._after_token_transfer(contract_address_const::<0>(), to, token_id, 1.into());
        }


        fn _burn(ref self: ContractState, token_id: u256) {
            let owner = self._owner_of(token_id);
            self._before_token_transfer(owner, contract_address_const::<0>(), token_id, 1.into());
            let owner = self._owner_of(token_id);
            self.token_approvals.write(token_id, contract_address_const::<0>());

            self.balances.write(owner, self.balances.read(owner) - 1.into());
            self.owners.write(token_id, contract_address_const::<0>());
            self
                .emit(
                    Event::Transfer(
                        Transfer { from: owner, to: contract_address_const::<0>(), token_id }
                    )
                );

            self._after_token_transfer(owner, contract_address_const::<0>(), token_id, 1.into());
        }

        fn _safe_mint(ref self: ContractState, to: ContractAddress, token_id: u256) {
            self._mint(to, token_id);
            assert(
                self
                    ._check_on_ERC721_received(
                        contract_address_const::<0>(),
                        to,
                        token_id,
                        ArrayTrait::<felt252>::new().span()
                    ),
                'transfer to non ERC721Receiver'
            );
        }

        /// looks like overloading is not supported currently
        // fn _safe_mint(
        //     ref self: ContractState,
        //     to: ContractAddress,
        //     token_id: u256,
        //     _data: Span<felt252>
        // ) {
        //     self._mint(to, token_id);
        //     assert(self._check_on_ERC721_received(contract_address_const::<0>(), to, token_id, _data),
        //         'transfer to non ERC721Receiver');
        // }

        fn _safe_transfer(
            ref self: ContractState,
            from: ContractAddress,
            to: ContractAddress,
            token_id: u256,
            _data: Span<felt252>
        ) {
            self._transfer(from, to, token_id);
            assert(
                self._check_on_ERC721_received(from, to, token_id, _data),
                'transfer to non ERC721Receiver'
            );
        }

        fn _check_on_ERC721_received(
            ref self: ContractState,
            from: ContractAddress,
            to: ContractAddress,
            token_id: u256,
            _data: Span<felt252>
        ) -> bool {
            ERC721Receiver { contract_address: to }
                .on_erc721_received(get_caller_address(), from, token_id, _data);
            // todo
            true
        }

        fn _before_token_transfer(
            ref self: ContractState,
            from: ContractAddress,
            to: ContractAddress,
            first_token_id: u256,
            batch_size: u256
        ) {}

        fn _after_token_transfer(
            ref self: ContractState,
            from: ContractAddress,
            to: ContractAddress,
            first_token_id: u256,
            batch_size: u256
        ) {}
    }

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


