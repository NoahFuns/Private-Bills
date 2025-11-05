"use client";

import { ethers } from "ethers";
import {
  RefObject,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { FhevmInstance } from "@/fhevm/fhevmTypes";
import { FhevmDecryptionSignature } from "@/fhevm/FhevmDecryptionSignature";
import { GenericStringStorage } from "@/fhevm/GenericStringStorage";

import { PrivateBillsAddresses } from "@/abi/PrivateBillsAddresses";
import { PrivateBillsABI } from "@/abi/PrivateBillsABI";
import { EXPENSE_TAGS, INCOME_TAGS } from "@/fhevm/internal/constants";

export type ClearValueType = {
  handle: string;
  clear: string | bigint | boolean;
};

type PrivateBillsInfoType = {
  abi: typeof PrivateBillsABI.abi;
  address?: `0x${string}`;
  chainId?: number;
  chainName?: string;
};

function getPrivateBillsByChainId(
  chainId: number | undefined
): PrivateBillsInfoType {
  if (!chainId) {
    return { abi: PrivateBillsABI.abi };
  }
  const entry =
    PrivateBillsAddresses[chainId.toString() as keyof typeof PrivateBillsAddresses];
  if (!entry || !("address" in entry) || entry.address === ethers.ZeroAddress) {
    return { abi: PrivateBillsABI.abi, chainId };
  }
  return {
    address: entry?.address as `0x${string}` | undefined,
    chainId: entry?.chainId ?? chainId,
    chainName: entry?.chainName,
    abi: PrivateBillsABI.abi,
  };
}

export const usePrivateBills = (parameters: {
  instance: FhevmInstance | undefined;
  fhevmDecryptionSignatureStorage: GenericStringStorage;
  eip1193Provider: ethers.Eip1193Provider | undefined;
  chainId: number | undefined;
  ethersSigner: ethers.JsonRpcSigner | undefined;
  ethersReadonlyProvider: ethers.ContractRunner | undefined;
  sameChain: RefObject<(chainId: number | undefined) => boolean>;
  sameSigner: RefObject<
    (ethersSigner: ethers.JsonRpcSigner | undefined) => boolean
  >;
}) => {
  const {
    instance,
    fhevmDecryptionSignatureStorage,
    chainId,
    ethersSigner,
    ethersReadonlyProvider,
    sameChain,
    sameSigner,
  } = parameters;

  const [balanceHandle, setBalanceHandle] = useState<string | undefined>(undefined);
  const [clearBalance, setClearBalance] = useState<ClearValueType | undefined>(
    undefined
  );
  const [monthlyHandle, setMonthlyHandle] = useState<string | undefined>(undefined);
  const [clearMonthly, setClearMonthly] = useState<ClearValueType | undefined>(
    undefined
  );
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [isDecrypting, setIsDecrypting] = useState<boolean>(false);
  const [isAdding, setIsAdding] = useState<boolean>(false);
  const [message, setMessage] = useState<string>("");

  // monthly expense by tag
  const [monthlyTagHandles, setMonthlyTagHandles] = useState<Record<string, string | undefined>>({});
  const [monthlyTagClears, setMonthlyTagClears] = useState<Record<string, ClearValueType | undefined>>({});
  const [isMonthlyTagsDecrypted, setIsMonthlyTagsDecrypted] = useState<boolean>(false);

  // monthly income by tag
  const [monthlyIncomeTagHandles, setMonthlyIncomeTagHandles] = useState<Record<string, string | undefined>>({});
  const [monthlyIncomeTagClears, setMonthlyIncomeTagClears] = useState<Record<string, ClearValueType | undefined>>({});
  const [isMonthlyIncomeTagsDecrypted, setIsMonthlyIncomeTagsDecrypted] = useState<boolean>(false);

  const billsRef = useRef<PrivateBillsInfoType | undefined>(undefined);
  const isRefreshingRef = useRef<boolean>(isRefreshing);
  const isDecryptingRef = useRef<boolean>(isDecrypting);
  const isAddingRef = useRef<boolean>(isAdding);

  const isBalanceDecrypted = balanceHandle && balanceHandle === clearBalance?.handle;
  const isMonthlyDecrypted = monthlyHandle && monthlyHandle === clearMonthly?.handle;

  const bills = useMemo(() => {
    const c = getPrivateBillsByChainId(chainId);
    billsRef.current = c;
    if (chainId !== undefined && !c.address) {
      setMessage(`PrivateBills deployment not found for chainId=${chainId}.`);
    } else {
      // 当 chainId 未定义或已有地址时不提示未部署
      setMessage("");
    }
    return c;
  }, [chainId]);

  // helper: detect ethers BAD_DATA with empty return (ABI/地址不同步)
  const isBadDataZero = useCallback((e: unknown) => {
    const s = String(e ?? "");
    return s.includes("BAD_DATA") && s.includes("value=\"0x\"");
  }, []);

  const isDeployed = useMemo(() => {
    if (!bills) {
      return undefined;
    }
    return Boolean(bills.address) && bills.address !== ethers.ZeroAddress;
  }, [bills]);

  const canQuery = useMemo(() => {
    // 依赖 msg.sender 的合约查询必须通过 signer 执行 eth_call 才能传入 from
    return bills.address && ethersSigner && !isRefreshing;
  }, [bills.address, ethersSigner, isRefreshing]);

  const refreshBalanceHandle = useCallback(() => {
    if (isRefreshingRef.current) return;
    if (!billsRef.current?.address || !ethersSigner) {
      setBalanceHandle(undefined);
      return;
    }
    isRefreshingRef.current = true;
    setIsRefreshing(true);
    const thisAddress = billsRef.current.address;
    const contract = new ethers.Contract(thisAddress, billsRef.current.abi, ethersSigner);
    // getMyBalance() is nonpayable in ABI, use static call with readonly provider
    contract.getMyBalance.staticCall()
      .then((value: string) => {
        setBalanceHandle(value);
      })
      .catch((e: unknown) => {
        if (isBadDataZero(e)) {
          setBalanceHandle(ethers.ZeroHash);
          setMessage("getMyBalance() not available on this contract address. Please redeploy the contract and run `npm run genabi`.");
        } else {
          setMessage(`getMyBalance() failed: ${e}`);
        }
      })
      .finally(() => { isRefreshingRef.current = false; setIsRefreshing(false); });
  }, [ethersSigner, isBadDataZero]);

  const refreshMonthlyExpenseHandle = useCallback((monthKey: number) => {
    if (isRefreshingRef.current) return;
    if (!billsRef.current?.address || !ethersSigner) {
      setMonthlyHandle(undefined);
      return;
    }
    isRefreshingRef.current = true;
    setIsRefreshing(true);
    const thisAddress = billsRef.current.address;
    const contract = new ethers.Contract(thisAddress, billsRef.current.abi, ethersSigner);
    contract.getMyMonthlyNet.staticCall(monthKey)
      .then((value: string) => {
        setMonthlyHandle(value);
      })
      .catch((e: unknown) => {
        if (isBadDataZero(e)) {
          setMonthlyHandle(ethers.ZeroHash);
          setMessage("getMyMonthlyNet() not available on this contract address. Please redeploy the contract and run `npm run genabi`.");
        } else {
          setMessage(`getMyMonthlyNet() failed: ${e}`);
        }
      })
      .finally(() => { isRefreshingRef.current = false; setIsRefreshing(false); });
  }, [ethersSigner, isBadDataZero]);

  const refreshMonthlyExpenseByTags = useCallback((monthKey: number, tags: string[]) => {
    if (isRefreshingRef.current) return;
    if (!billsRef.current?.address || !ethersSigner) {
      setMonthlyTagHandles({});
      return;
    }
    isRefreshingRef.current = true;
    setIsRefreshing(true);
    const thisAddress = billsRef.current.address;
    const contract = new ethers.Contract(thisAddress, billsRef.current.abi, ethersSigner);
    Promise.all(tags.map((t) => contract.getMyMonthlyExpenseByTag(monthKey, t) as Promise<string>))
      .then((values) => {
        const next: Record<string, string> = {};
        tags.forEach((t, i) => { next[t] = values[i]; });
        setMonthlyTagHandles(next);
        setIsMonthlyTagsDecrypted(false);
      })
      .catch((e: unknown) => {
        if (isBadDataZero(e)) {
          const next: Record<string, string> = {};
          tags.forEach((t) => { next[t] = ethers.ZeroHash; });
          setMonthlyTagHandles(next);
          setIsMonthlyTagsDecrypted(false);
          setMessage("getMyMonthlyExpenseByTag() not available on this contract address. Please redeploy the contract and run `npm run genabi`.");
        } else {
          setMessage(`getMyMonthlyExpenseByTag() failed: ${e}`);
        }
      })
      .finally(() => { isRefreshingRef.current = false; setIsRefreshing(false); });
  }, [ethersSigner, isBadDataZero]);

  const refreshMonthlyIncomeByTags = useCallback((monthKey: number, tags: string[]) => {
    if (isRefreshingRef.current) return;
    if (!billsRef.current?.address || !ethersSigner) {
      setMonthlyIncomeTagHandles({});
      return;
    }
    isRefreshingRef.current = true;
    setIsRefreshing(true);
    const thisAddress = billsRef.current.address;
    const contract = new ethers.Contract(thisAddress, billsRef.current.abi, ethersSigner);
    Promise.all(tags.map((t) => contract.getMyMonthlyIncomeByTag(monthKey, t) as Promise<string>))
      .then((values) => {
        const next: Record<string, string> = {};
        tags.forEach((t, i) => { next[t] = values[i]; });
        setMonthlyIncomeTagHandles(next);
        setIsMonthlyIncomeTagsDecrypted(false);
      })
      .catch((e: unknown) => {
        if (isBadDataZero(e)) {
          const next: Record<string, string> = {};
          tags.forEach((t) => { next[t] = ethers.ZeroHash; });
          setMonthlyIncomeTagHandles(next);
          setIsMonthlyIncomeTagsDecrypted(false);
          setMessage("getMyMonthlyIncomeByTag() not available on this contract address. Please redeploy the contract and run `npm run genabi`.");
        } else {
          setMessage(`getMyMonthlyIncomeByTag() failed: ${e}`);
        }
      })
      .finally(() => { isRefreshingRef.current = false; setIsRefreshing(false); });
  }, [ethersSigner, isBadDataZero]);

  useEffect(() => {
    refreshBalanceHandle();
  }, [refreshBalanceHandle]);

  const canDecrypt = useMemo(() => {
    return (
      bills.address && instance && ethersSigner && !isRefreshing && !isDecrypting
    );
  }, [bills.address, instance, ethersSigner, isRefreshing, isDecrypting]);

  const decryptHandle = useCallback((handle: string | undefined, setClear: (v: ClearValueType) => void) => {
    if (isRefreshingRef.current || isDecryptingRef.current) return;
    if (!bills.address || !instance || !ethersSigner) return;
    if (!handle) return;
    if (handle === ethers.ZeroHash) {
      setClear({ handle, clear: BigInt(0) });
      return;
    }
    const thisAddress = bills.address; const thisHandle = handle; const thisSigner = ethersSigner;
    isDecryptingRef.current = true; setIsDecrypting(true); setMessage("Start decrypt");
    const isStale = () => thisAddress !== billsRef.current?.address || !(sameSigner.current && sameSigner.current(thisSigner));
    (async () => {
      try {
        const sig: FhevmDecryptionSignature | null = await FhevmDecryptionSignature.loadOrSign(
          instance,
          [thisAddress as `0x${string}`],
          thisSigner,
          fhevmDecryptionSignatureStorage
        );
        if (!sig) { setMessage("Unable to build FHEVM decryption signature"); return; }
        if (isStale()) { setMessage("Ignore FHEVM decryption"); return; }
        setMessage("Call FHEVM userDecrypt...");
        const res = await instance.userDecrypt(
          [{ handle: thisHandle, contractAddress: thisAddress }],
          sig.privateKey,
          sig.publicKey,
          sig.signature,
          sig.contractAddresses,
          sig.userAddress,
          sig.startTimestamp,
          sig.durationDays
        );
        if (isStale()) { setMessage("Ignore FHEVM decryption"); return; }
        setClear({ handle: thisHandle, clear: res[thisHandle] });
        setMessage("Decrypt completed");
      } finally {
        isDecryptingRef.current = false; setIsDecrypting(false);
      }
    })();
  }, [bills.address, instance, ethersSigner, fhevmDecryptionSignatureStorage, sameSigner]);

  const decryptBalanceHandle = useCallback(() => {
    if (!balanceHandle) return; 
    decryptHandle(balanceHandle, (v) => setClearBalance(v));
  }, [balanceHandle, decryptHandle]);

  const decryptMonthlyExpenseHandle = useCallback(() => {
    if (!monthlyHandle) return; 
    decryptHandle(monthlyHandle, (v) => setClearMonthly(v));
  }, [monthlyHandle, decryptHandle]);

  const decryptMonthlyExpenseByTags = useCallback((tags: string[]) => {
    if (isRefreshingRef.current || isDecryptingRef.current) return;
    if (!bills.address || !instance || !ethersSigner) return;
    const thisAddress = bills.address; const thisSigner = ethersSigner;
    const handlesWithTags = tags
      .map((t) => ({ tag: t, handle: monthlyTagHandles[t] }))
      .filter((x): x is { tag: string; handle: string } => Boolean(x.handle));
    if (handlesWithTags.length === 0) return;
    const nonZero = handlesWithTags.filter((x) => x.handle !== ethers.ZeroHash);
    isDecryptingRef.current = true; setIsDecrypting(true); setMessage("Start decrypt tags");
    const isStale = () => thisAddress !== billsRef.current?.address || !(sameSigner.current && sameSigner.current(thisSigner));
    (async () => {
      try {
        const sig: FhevmDecryptionSignature | null = await FhevmDecryptionSignature.loadOrSign(
          instance,
          [thisAddress as `0x${string}`],
          thisSigner,
          fhevmDecryptionSignatureStorage
        );
        if (!sig) { setMessage("Unable to build FHEVM decryption signature"); return; }
        if (isStale()) { setMessage("Ignore FHEVM decryption"); return; }
        setMessage("Call FHEVM userDecrypt for tags...");
        const payload = nonZero.map((x) => ({ handle: x.handle, contractAddress: thisAddress }));
        const res = await instance.userDecrypt(
          payload,
          sig.privateKey,
          sig.publicKey,
          sig.signature,
          sig.contractAddresses,
          sig.userAddress,
          sig.startTimestamp,
          sig.durationDays
        );
        if (isStale()) { setMessage("Ignore FHEVM decryption"); return; }
        const nextClears: Record<string, ClearValueType> = {};
        handlesWithTags.forEach(({ tag, handle }) => {
          if (handle === ethers.ZeroHash) {
            nextClears[tag] = { handle, clear: BigInt(0) };
          } else {
            nextClears[tag] = { handle, clear: res[handle] };
          }
        });
        setMonthlyTagClears(nextClears);
        setIsMonthlyTagsDecrypted(true);
        setMessage("Decrypt tags completed");
      } finally {
        isDecryptingRef.current = false; setIsDecrypting(false);
      }
    })();
  }, [bills.address, instance, ethersSigner, monthlyTagHandles, fhevmDecryptionSignatureStorage, sameSigner]);

  const decryptMonthlyIncomeByTags = useCallback((tags: string[]) => {
    if (isRefreshingRef.current || isDecryptingRef.current) return;
    if (!bills.address || !instance || !ethersSigner) return;
    const thisAddress = bills.address; const thisSigner = ethersSigner;
    const handlesWithTags = tags
      .map((t) => ({ tag: t, handle: monthlyIncomeTagHandles[t] }))
      .filter((x): x is { tag: string; handle: string } => Boolean(x.handle));
    if (handlesWithTags.length === 0) return;
    const nonZero = handlesWithTags.filter((x) => x.handle !== ethers.ZeroHash);
    isDecryptingRef.current = true; setIsDecrypting(true); setMessage("Start decrypt income tags");
    const isStale = () => thisAddress !== billsRef.current?.address || !(sameSigner.current && sameSigner.current(thisSigner));
    (async () => {
      try {
        const sig: FhevmDecryptionSignature | null = await FhevmDecryptionSignature.loadOrSign(
          instance,
          [thisAddress as `0x${string}`],
          thisSigner,
          fhevmDecryptionSignatureStorage
        );
        if (!sig) { setMessage("Unable to build FHEVM decryption signature"); return; }
        if (isStale()) { setMessage("Ignore FHEVM decryption"); return; }
        setMessage("Call FHEVM userDecrypt for income tags...");
        const payload = nonZero.map((x) => ({ handle: x.handle, contractAddress: thisAddress }));
        const res = await instance.userDecrypt(
          payload,
          sig.privateKey,
          sig.publicKey,
          sig.signature,
          sig.contractAddresses,
          sig.userAddress,
          sig.startTimestamp,
          sig.durationDays
        );
        if (isStale()) { setMessage("Ignore FHEVM decryption"); return; }
        const nextClears: Record<string, ClearValueType> = {};
        handlesWithTags.forEach(({ tag, handle }) => {
          if (handle === ethers.ZeroHash) {
            nextClears[tag] = { handle, clear: BigInt(0) };
          } else {
            nextClears[tag] = { handle, clear: res[handle] };
          }
        });
        setMonthlyIncomeTagClears(nextClears);
        setIsMonthlyIncomeTagsDecrypted(true);
        setMessage("Decrypt income tags completed");
      } finally {
        isDecryptingRef.current = false; setIsDecrypting(false);
      }
    })();
  }, [bills.address, instance, ethersSigner, monthlyIncomeTagHandles, fhevmDecryptionSignatureStorage, sameSigner]);

  const getMonthlyExpenseBreakdown = useCallback((tags: string[]) => {
    const items = tags.map((t) => {
      const v = monthlyTagClears[t]?.clear;
      const amount = typeof v === "bigint" ? v : BigInt(0);
      return { tag: t, amount };
    });
    // 百分比总额以标签支出之和为分母，避免使用“净额”导致占比失真
    const total = items.reduce((acc, it) => acc + it.amount, BigInt(0));
    const totalNum = Number(total);
    return items.map((it) => ({
      tag: it.tag,
      amount: it.amount,
      percent: totalNum > 0 ? Number(it.amount) / totalNum : 0,
    }));
  }, [monthlyTagClears, clearMonthly?.clear]);

  const getMonthlyIncomeBreakdown = useCallback((tags: string[]) => {
    const items = tags.map((t) => {
      const v = monthlyIncomeTagClears[t]?.clear;
      const amount = typeof v === "bigint" ? v : BigInt(0);
      return { tag: t, amount };
    });
    const total = items.reduce((acc, it) => acc + it.amount, BigInt(0));
    const totalNum = Number(total);
    return items.map((it) => ({
      tag: it.tag,
      amount: it.amount,
      percent: totalNum > 0 ? Number(it.amount) / totalNum : 0,
    }));
  }, [monthlyIncomeTagClears]);

  // One-click compute helpers
  const computeExpenseTagBreakdown = useCallback((monthKey: number, tags: string[]) => {
    if (isRefreshingRef.current || isDecryptingRef.current) return;
    if (!bills.address || !instance || !ethersSigner) return;
    const thisAddress = bills.address; const thisSigner = ethersSigner;
    isRefreshingRef.current = true; setIsRefreshing(true);
    const contract = new ethers.Contract(thisAddress, billsRef.current!.abi, thisSigner);
    (async () => {
      try {
        let handles: string[];
        try {
          handles = await Promise.all(tags.map((t) => contract.getMyMonthlyExpenseByTag(monthKey, t) as Promise<string>));
        } catch (e) {
          if (isBadDataZero(e)) {
            handles = tags.map(() => ethers.ZeroHash);
            setMessage("getMyMonthlyExpenseByTag() not available on this contract address. Please redeploy the contract and run `npm run genabi`.");
          } else {
            throw e;
          }
        }
        const next: Record<string, string> = {}; tags.forEach((t, i) => { next[t] = handles[i]; });
        setMonthlyTagHandles(next);
        setIsMonthlyTagsDecrypted(false);
        // decrypt
        const handlesWithTags = tags.map((t) => ({ tag: t, handle: next[t] })).filter((x): x is { tag: string; handle: string } => Boolean(x.handle));
        const nonZero = handlesWithTags.filter((x) => x.handle !== ethers.ZeroHash);
        isDecryptingRef.current = true; setIsDecrypting(true);
        const sig: FhevmDecryptionSignature | null = await FhevmDecryptionSignature.loadOrSign(
          instance, [thisAddress as `0x${string}`], thisSigner, fhevmDecryptionSignatureStorage
        );
        if (!sig) { setMessage("Unable to build FHEVM decryption signature"); return; }
        const payload = nonZero.map((x) => ({ handle: x.handle, contractAddress: thisAddress }));
        const res = await instance.userDecrypt(
          payload,
          sig.privateKey,
          sig.publicKey,
          sig.signature,
          sig.contractAddresses,
          sig.userAddress,
          sig.startTimestamp,
          sig.durationDays
        );
        const nextClears: Record<string, ClearValueType> = {};
        handlesWithTags.forEach(({ tag, handle }) => {
          if (handle === ethers.ZeroHash) nextClears[tag] = { handle, clear: BigInt(0) };
          else nextClears[tag] = { handle, clear: res[handle] };
        });
        setMonthlyTagClears(nextClears);
        setIsMonthlyTagsDecrypted(true);
        setMessage("Expense tag breakdown computed");
      } finally {
        isRefreshingRef.current = false; setIsRefreshing(false);
        isDecryptingRef.current = false; setIsDecrypting(false);
      }
    })();
  }, [bills.address, instance, ethersSigner, fhevmDecryptionSignatureStorage, isBadDataZero]);

  const computeIncomeTagBreakdown = useCallback((monthKey: number, tags: string[]) => {
    if (isRefreshingRef.current || isDecryptingRef.current) return;
    if (!bills.address || !instance || !ethersSigner) return;
    const thisAddress = bills.address; const thisSigner = ethersSigner;
    isRefreshingRef.current = true; setIsRefreshing(true);
    const contract = new ethers.Contract(thisAddress, billsRef.current!.abi, thisSigner);
    (async () => {
      try {
        let handles: string[];
        try {
          handles = await Promise.all(tags.map((t) => contract.getMyMonthlyIncomeByTag(monthKey, t) as Promise<string>));
        } catch (e) {
          if (isBadDataZero(e)) {
            handles = tags.map(() => ethers.ZeroHash);
            setMessage("getMyMonthlyIncomeByTag() not available on this contract address. Please redeploy the contract and run `npm run genabi`.");
          } else {
            throw e;
          }
        }
        const next: Record<string, string> = {}; tags.forEach((t, i) => { next[t] = handles[i]; });
        setMonthlyIncomeTagHandles(next);
        setIsMonthlyIncomeTagsDecrypted(false);
        // decrypt
        const handlesWithTags = tags.map((t) => ({ tag: t, handle: next[t] })).filter((x): x is { tag: string; handle: string } => Boolean(x.handle));
        const nonZero = handlesWithTags.filter((x) => x.handle !== ethers.ZeroHash);
        isDecryptingRef.current = true; setIsDecrypting(true);
        const sig: FhevmDecryptionSignature | null = await FhevmDecryptionSignature.loadOrSign(
          instance, [thisAddress as `0x${string}`], thisSigner, fhevmDecryptionSignatureStorage
        );
        if (!sig) { setMessage("Unable to build FHEVM decryption signature"); return; }
        const payload = nonZero.map((x) => ({ handle: x.handle, contractAddress: thisAddress }));
        const res = await instance.userDecrypt(
          payload,
          sig.privateKey,
          sig.publicKey,
          sig.signature,
          sig.contractAddresses,
          sig.userAddress,
          sig.startTimestamp,
          sig.durationDays
        );
        const nextClears: Record<string, ClearValueType> = {};
        handlesWithTags.forEach(({ tag, handle }) => {
          if (handle === ethers.ZeroHash) nextClears[tag] = { handle, clear: BigInt(0) };
          else nextClears[tag] = { handle, clear: res[handle] };
        });
        setMonthlyIncomeTagClears(nextClears);
        setIsMonthlyIncomeTagsDecrypted(true);
        setMessage("Income tag breakdown computed");
      } finally {
        isRefreshingRef.current = false; setIsRefreshing(false);
        isDecryptingRef.current = false; setIsDecrypting(false);
      }
    })();
  }, [bills.address, instance, ethersSigner, fhevmDecryptionSignatureStorage, isBadDataZero]);

  const canAdd = useMemo(() => {
    return bills.address && instance && ethersSigner && !isRefreshing && !isAdding;
  }, [bills.address, instance, ethersSigner, isRefreshing, isAdding]);

  const addRecord = useCallback((amount: number, isIncome: boolean, tag: string, timestamp: number, monthKey: number) => {
    if (isRefreshingRef.current || isAddingRef.current) return;
    if (!bills.address || !instance || !ethersSigner) return;
    const thisAddress = bills.address; const thisSigner = ethersSigner; const thisAmount = amount;
    const thisMonthKey = monthKey; const thisTs = timestamp; const thisTag = tag;
    isAddingRef.current = true; setIsAdding(true); setMessage("Start addRecord...");
    (async () => {
      try {
        await new Promise((resolve) => setTimeout(resolve, 100));
        const input = instance.createEncryptedInput(thisAddress, thisSigner.address);
        input.add64(Math.abs(thisAmount));
        const enc = await input.encrypt();
        const contract = new ethers.Contract(thisAddress, billsRef.current!.abi, thisSigner);
        const tx: ethers.TransactionResponse = await contract.addRecord(
          enc.handles[0], enc.inputProof, isIncome, thisTs, thisTag, thisMonthKey
        );
        setMessage(`Wait for tx:${tx.hash}...`);
        await tx.wait();
        setMessage("addRecord completed");
        // refresh balance and monthly aggregates
        refreshBalanceHandle();
        refreshMonthlyExpenseHandle(thisMonthKey);
        refreshMonthlyExpenseByTags(thisMonthKey, EXPENSE_TAGS);
      } catch (e) {
        setMessage(`addRecord failed: ${e}`);
      } finally { isAddingRef.current = false; setIsAdding(false); }
    })();
  }, [bills.address, instance, ethersSigner, refreshBalanceHandle, refreshMonthlyExpenseHandle, refreshMonthlyExpenseByTags]);

  return {
    contractAddress: bills.address,
    canQuery,
    canDecrypt,
    canAdd,
    addRecord,
    refreshBalanceHandle,
    refreshMonthlyExpenseHandle,
    decryptBalanceHandle,
    decryptMonthlyExpenseHandle,
    refreshMonthlyExpenseByTags,
    decryptMonthlyExpenseByTags,
    refreshMonthlyIncomeByTags,
    decryptMonthlyIncomeByTags,
    computeExpenseTagBreakdown,
    computeIncomeTagBreakdown,
    isDeployed,
    isRefreshing,
    isDecrypting,
    isAdding,
    balanceHandle,
    monthlyHandle,
    balanceClear: clearBalance?.clear,
    monthlyClear: clearMonthly?.clear,
    monthlyTagHandles,
    monthlyTagClears,
    isMonthlyTagsDecrypted,
    monthlyIncomeTagHandles,
    monthlyIncomeTagClears,
    isMonthlyIncomeTagsDecrypted,
    getMonthlyExpenseBreakdown,
    getMonthlyIncomeBreakdown,
    isBalanceDecrypted,
    isMonthlyDecrypted,
    message,
  };
};


