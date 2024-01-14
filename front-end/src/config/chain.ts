import type ITemplate from '@/interfaces/template';

const chainConfig = {
  name: 'Starknet',
  docs: 'https://docs.defibuilder.com/',
  contractFileExtension: '.cairo',
  templates: [
    {
      name: 'Token',
      isActive: true
    },
    {
      name: 'NFT',
      isActive: true
    },
    {
      name: 'Edition',
      isActive: true
    },
    {
      name: 'Vault',
      isActive: true
    },
    {
      name: 'Marketplace',
      isActive: true
    },
    {
      name: 'Exchange',
      isActive: true
    }
  ] as ITemplate[]
};

export default chainConfig;
