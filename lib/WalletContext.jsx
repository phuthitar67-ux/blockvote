"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { BrowserProvider, formatEther } from "ethers";
import { CHAIN_ID, SEPOLIA_NETWORK_PARAMS } from "@/lib/web3/config";

const WalletContext = createContext(null);

export function WalletProvider({ children }) {
  const [address, setAddress] = useState(null);
  const [balanceEth, setBalanceEth] = useState(null);
  const [chainName, setChainName] = useState(null);
  const [chainId, setChainId] = useState(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState(null);

  const loadAccountData = useCallback(async (account) => {
    const provider = new BrowserProvider(window.ethereum);
    const [balanceWei, network] = await Promise.all([
      provider.getBalance(account),
      provider.getNetwork(),
    ]);
    setAddress(account);
    setBalanceEth(formatEther(balanceWei));
    setChainName(network.name === "unknown" ? `Chain ${network.chainId}` : network.name);
    setChainId(Number(network.chainId));
  }, []);

  const switchNetwork = useCallback(async () => {
    if (typeof window === "undefined" || !window.ethereum) return;
    try {
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: SEPOLIA_NETWORK_PARAMS.chainId }],
      });
    } catch (switchError) {
      if (switchError?.code === 4902) {
        try {
          await window.ethereum.request({
            method: "wallet_addEthereumChain",
            params: [SEPOLIA_NETWORK_PARAMS],
          });
        } catch {
          // user dismissed the add-network prompt; nothing more we can do
        }
      }
    }
  }, []);

  const connect = useCallback(async () => {
    if (typeof window === "undefined" || !window.ethereum) {
      setError("ไม่พบ MetaMask กรุณาติดตั้งส่วนขยายก่อนเชื่อมต่อกระเป๋า");
      return;
    }

    setIsConnecting(true);
    setError(null);

    try {
      const provider = new BrowserProvider(window.ethereum);
      const accounts = await provider.send("eth_requestAccounts", []);
      if (accounts[0]) await loadAccountData(accounts[0]);
    } catch (err) {
      if (err?.code !== 4001) {
        setError("ไม่สามารถเชื่อมต่อกระเป๋าได้ กรุณาลองใหม่อีกครั้ง");
      }
    } finally {
      setIsConnecting(false);
    }
  }, [loadAccountData]);

  const disconnect = useCallback(() => {
    setAddress(null);
    setBalanceEth(null);
    setChainName(null);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || !window.ethereum) return;

    window.ethereum
      .request({ method: "eth_chainId" })
      .then((hexChainId) => setChainId(parseInt(hexChainId, 16)))
      .catch(() => {});

    window.ethereum
      .request({ method: "eth_accounts" })
      .then((accounts) => {
        if (accounts[0]) loadAccountData(accounts[0]);
      })
      .catch(() => {});

    const handleAccountsChanged = (accounts) => {
      if (accounts[0]) loadAccountData(accounts[0]);
      else disconnect();
    };
    const handleChainChanged = (hexChainId) => {
      setChainId(parseInt(hexChainId, 16));
      window.ethereum
        .request({ method: "eth_accounts" })
        .then((accounts) => {
          if (accounts[0]) loadAccountData(accounts[0]);
        })
        .catch(() => {});
    };

    window.ethereum.on("accountsChanged", handleAccountsChanged);
    window.ethereum.on("chainChanged", handleChainChanged);

    return () => {
      window.ethereum.removeListener("accountsChanged", handleAccountsChanged);
      window.ethereum.removeListener("chainChanged", handleChainChanged);
    };
  }, [loadAccountData, disconnect]);

  const isWrongNetwork = chainId !== null && chainId !== CHAIN_ID;

  return (
    <WalletContext.Provider
      value={{
        address,
        balanceEth,
        chainName,
        chainId,
        isWrongNetwork,
        switchNetwork,
        isConnecting,
        error,
        connect,
        disconnect,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error("useWallet must be used within a WalletProvider");
  return ctx;
}
