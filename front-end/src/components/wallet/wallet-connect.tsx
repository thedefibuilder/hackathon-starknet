import React from 'react';

import type { ButtonProperties } from '../ui/button';

import { Button } from '../ui/button';

interface IWalletConnect extends ButtonProperties {
  onWalletConnect: () => void;
}

export function WalletConnect({ onWalletConnect, ...buttonProperties }: IWalletConnect) {
  return (
    <Button onClick={onWalletConnect} {...buttonProperties}>
      Connect wallet
    </Button>
  );
}
