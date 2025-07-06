/// <reference types="vite/client" />

interface Window {
  ethereum?: any; // You can use a more specific type like ethers.providers.ExternalProvider or Eip1193Provider
}
