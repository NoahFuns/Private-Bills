// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {FHE, euint64, externalEuint64} from "@fhevm/solidity/lib/FHE.sol";
import {SepoliaConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

/// @title PrivateBills - Encrypted on-chain accounting using Zama FHEVM
/// @notice Stores income/expense records encrypted; computes balance and monthly totals fully encrypted
/// @dev Mirrors Zama template FHE usage: FHE.fromExternal + FHE.add/sub + FHE.allowThis + FHE.allow
contract PrivateBills is SepoliaConfig {
    struct Record {
        euint64 amount; // encrypted amount
        bool isIncome; // plaintext flag
        uint64 timestamp; // plaintext timestamp (seconds)
        string tag; // optional plaintext tag/category
        uint32 monthKey; // YYYYMM or client-provided month bucket key
    }

    // Aggregates per user
    mapping(address => euint64) private _incomeSum;
    mapping(address => euint64) private _expenseSum;
    mapping(address => mapping(uint32 => euint64)) private _monthlyExpenseSum; // expenses only
    // Monthly income aggregation (income only)
    mapping(address => mapping(uint32 => euint64)) private _monthlyIncomeSum;
    // monthly income aggregation by tag (income only)
    mapping(address => mapping(uint32 => mapping(string => euint64))) private _monthlyIncomeByTag;
    // monthly expense aggregation by tag (expenses only)
    mapping(address => mapping(uint32 => mapping(string => euint64))) private _monthlyExpenseByTag;
    // Stored net aggregates for stable authorization and decryption
    mapping(address => euint64) private _netSum; // income - expense
    mapping(address => mapping(uint32 => euint64)) private _monthlyNetSum; // monthly income - expense

    // Full record list per user
    mapping(address => Record[]) private _records;

    /// @notice Add an income or expense record with encrypted amount
    /// @param inputEuint64 encrypted amount handle produced off-chain
    /// @param inputProof input proof returned by FHEVM SDK
    /// @param isIncome true for income, false for expense
    /// @param timestamp unix timestamp in seconds
    /// @param tag optional plaintext tag/category
    /// @param monthKey month bucket key (e.g. 202510 for 2025-10)
    function addRecord(
        externalEuint64 inputEuint64,
        bytes calldata inputProof,
        bool isIncome,
        uint64 timestamp,
        string calldata tag,
        uint32 monthKey
    ) external {
        euint64 amount = FHE.fromExternal(inputEuint64, inputProof);

        if (isIncome) {
            _incomeSum[msg.sender] = FHE.add(_incomeSum[msg.sender], amount);
            FHE.allowThis(_incomeSum[msg.sender]);
            FHE.allow(_incomeSum[msg.sender], msg.sender);

            // monthly aggregate (income only)
            _monthlyIncomeSum[msg.sender][monthKey] = FHE.add(
                _monthlyIncomeSum[msg.sender][monthKey],
                amount
            );
            FHE.allowThis(_monthlyIncomeSum[msg.sender][monthKey]);
            FHE.allow(_monthlyIncomeSum[msg.sender][monthKey], msg.sender);

            // monthly aggregate by tag (income only)
            _monthlyIncomeByTag[msg.sender][monthKey][tag] = FHE.add(
                _monthlyIncomeByTag[msg.sender][monthKey][tag],
                amount
            );
            FHE.allowThis(_monthlyIncomeByTag[msg.sender][monthKey][tag]);
            FHE.allow(_monthlyIncomeByTag[msg.sender][monthKey][tag], msg.sender);
            // update net sums
            _netSum[msg.sender] = FHE.add(_netSum[msg.sender], amount);
            FHE.allowThis(_netSum[msg.sender]);
            FHE.allow(_netSum[msg.sender], msg.sender);
            _monthlyNetSum[msg.sender][monthKey] = FHE.add(
                _monthlyNetSum[msg.sender][monthKey],
                amount
            );
            FHE.allowThis(_monthlyNetSum[msg.sender][monthKey]);
            FHE.allow(_monthlyNetSum[msg.sender][monthKey], msg.sender);
        } else {
            _expenseSum[msg.sender] = FHE.add(_expenseSum[msg.sender], amount);
            FHE.allowThis(_expenseSum[msg.sender]);
            FHE.allow(_expenseSum[msg.sender], msg.sender);

            // monthly aggregate (expenses only)
            _monthlyExpenseSum[msg.sender][monthKey] = FHE.add(
                _monthlyExpenseSum[msg.sender][monthKey],
                amount
            );
            FHE.allowThis(_monthlyExpenseSum[msg.sender][monthKey]);
            FHE.allow(_monthlyExpenseSum[msg.sender][monthKey], msg.sender);

            // monthly aggregate by tag (expenses only)
            _monthlyExpenseByTag[msg.sender][monthKey][tag] = FHE.add(
                _monthlyExpenseByTag[msg.sender][monthKey][tag],
                amount
            );
            FHE.allowThis(_monthlyExpenseByTag[msg.sender][monthKey][tag]);
            FHE.allow(_monthlyExpenseByTag[msg.sender][monthKey][tag], msg.sender);
            // update net sums (subtract expenses)
            _netSum[msg.sender] = FHE.sub(_netSum[msg.sender], amount);
            FHE.allowThis(_netSum[msg.sender]);
            FHE.allow(_netSum[msg.sender], msg.sender);
            _monthlyNetSum[msg.sender][monthKey] = FHE.sub(
                _monthlyNetSum[msg.sender][monthKey],
                amount
            );
            FHE.allowThis(_monthlyNetSum[msg.sender][monthKey]);
            FHE.allow(_monthlyNetSum[msg.sender][monthKey], msg.sender);
        }

        _records[msg.sender].push(
            Record({
                amount: amount,
                isIncome: isIncome,
                timestamp: timestamp,
                tag: tag,
                monthKey: monthKey
            })
        );

        // Allow user to decrypt the newly added record amount
        Record storage r = _records[msg.sender][_records[msg.sender].length - 1];
        FHE.allow(r.amount, msg.sender);
    }

    /// @notice Returns the encrypted balance for the caller: sum(income) - sum(expense)
    function getMyBalance() external view returns (euint64) {
        return _netSum[msg.sender];
    }

    /// @notice Returns the encrypted monthly expense for the given monthKey for the caller
    function getMyMonthlyExpense(uint32 monthKey) external view returns (euint64) {
        return _monthlyExpenseSum[msg.sender][monthKey];
    }

    /// @notice Returns the encrypted monthly net for the given monthKey for the caller: income - expense
    function getMyMonthlyNet(uint32 monthKey) external view returns (euint64) {
        return _monthlyNetSum[msg.sender][monthKey];
    }

    /// @notice Returns the encrypted monthly expense for the given monthKey and tag for the caller
    function getMyMonthlyExpenseByTag(uint32 monthKey, string calldata tag) external view returns (euint64) {
        return _monthlyExpenseByTag[msg.sender][monthKey][tag];
    }

    /// @notice Returns the encrypted monthly income for the given monthKey and tag for the caller
    function getMyMonthlyIncomeByTag(uint32 monthKey, string calldata tag) external view returns (euint64) {
        return _monthlyIncomeByTag[msg.sender][monthKey][tag];
    }

    /// @notice Returns the number of records for the caller
    function getMyRecordCount() external view returns (uint256) {
        return _records[msg.sender].length;
    }

    /// @notice Returns plaintext meta for a specific record index of the caller
    function getMyRecordMeta(
        uint256 index
    ) external view returns (bool isIncome, uint64 timestamp, string memory tag, uint32 monthKey) {
        require(index < _records[msg.sender].length, "Index out of bounds");
        Record storage r = _records[msg.sender][index];
        return (r.isIncome, r.timestamp, r.tag, r.monthKey);
    }

    /// @notice Returns the encrypted amount handle for a specific record index of the caller
    function getMyRecordAmount(uint256 index) external view returns (euint64) {
        require(index < _records[msg.sender].length, "Index out of bounds");
        return _records[msg.sender][index].amount;
    }
}


