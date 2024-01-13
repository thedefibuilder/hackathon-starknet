import React, { useEffect, useState } from 'react';

import type { StarknetWindowObject } from 'starknetkit';

import { connect, disconnect } from 'starknetkit';
import { type ConnectOptions } from 'starknetkit/dist/types/modal';

import config from '../../../_config';
import { type ButtonProperties } from '../ui/button';
import { WalletConnect } from './wallet-connect';
import { WalletDetails } from './wallet-details';

enum EChainsId {
  mainnet = 'SN_MAIN',
  testnet = 'SN_GOERLI'
}

export enum ENetwoks {
  mainnet = 'Mainnet',
  testnet = 'Testnet'
}

const sharedProperties: ConnectOptions = {
  dappName: config.metadata.title,
  modalTheme: 'dark',
  webWalletUrl: 'https://web.argent.xyz'
};

const onReconnectProperties: ConnectOptions = {
  ...sharedProperties,
  modalMode: 'neverAsk'
};

interface IWallet extends ButtonProperties {}

export function Wallet({ ...buttonProperties }: IWallet) {
  const [walletConnection, setWalletConnection] = useState<StarknetWindowObject | null>(null);

  const isWalletConnected = walletConnection?.isConnected ?? false;
  const walletName = walletConnection?.name ?? '';
  const walletAddress = walletConnection?.selectedAddress ?? '';
  const chainId = walletConnection?.chainId ?? '';
  const isMainnet = chainId === EChainsId.mainnet.toString();

  useEffect(() => {
    onWalletConnect(onReconnectProperties).catch((error) =>
      console.error('Error connecting wallet', error)
    );
  }, []);

  async function onWalletConnect(properties = sharedProperties) {
    const walletConnection = await connect(properties ? { ...properties } : {});

    if (walletConnection && walletConnection.isConnected) {
      setWalletConnection(walletConnection);
    }
  }

  async function onWalletChangeNetwork() {
    const response = await window.starknet?.request({
      type: 'wallet_switchStarknetChain',
      params: {
        chainId: isMainnet ? EChainsId.testnet : EChainsId.mainnet
      }
    });

    if (response) {
      window.location.reload();
    }
  }

  async function onWalletDisconnect() {
    await disconnect({ clearLastWallet: true });
    setWalletConnection(null);
  }

  return (
    <>
      {isWalletConnected ? (
        <WalletDetails
          isMainnet={isMainnet}
          walletName={walletName}
          address={walletAddress}
          onWalletChangeNetwork={onWalletChangeNetwork}
          onWalletDisconnect={onWalletDisconnect}
          {...buttonProperties}
        />
      ) : (
        <WalletConnect onWalletConnect={onWalletConnect} {...buttonProperties} />
      )}
    </>
  );
}
