
/*
  This file is auto-generated.
  Command: 'npm run genabi'
*/
export const PrivateBillsABI = {
  "abi": [
    {
      "inputs": [
        {
          "internalType": "externalEuint64",
          "name": "inputEuint64",
          "type": "bytes32"
        },
        {
          "internalType": "bytes",
          "name": "inputProof",
          "type": "bytes"
        },
        {
          "internalType": "bool",
          "name": "isIncome",
          "type": "bool"
        },
        {
          "internalType": "uint64",
          "name": "timestamp",
          "type": "uint64"
        },
        {
          "internalType": "string",
          "name": "tag",
          "type": "string"
        },
        {
          "internalType": "uint32",
          "name": "monthKey",
          "type": "uint32"
        }
      ],
      "name": "addRecord",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "getMyBalance",
      "outputs": [
        {
          "internalType": "euint64",
          "name": "",
          "type": "bytes32"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint32",
          "name": "monthKey",
          "type": "uint32"
        }
      ],
      "name": "getMyMonthlyExpense",
      "outputs": [
        {
          "internalType": "euint64",
          "name": "",
          "type": "bytes32"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint32",
          "name": "monthKey",
          "type": "uint32"
        },
        {
          "internalType": "string",
          "name": "tag",
          "type": "string"
        }
      ],
      "name": "getMyMonthlyExpenseByTag",
      "outputs": [
        {
          "internalType": "euint64",
          "name": "",
          "type": "bytes32"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint32",
          "name": "monthKey",
          "type": "uint32"
        },
        {
          "internalType": "string",
          "name": "tag",
          "type": "string"
        }
      ],
      "name": "getMyMonthlyIncomeByTag",
      "outputs": [
        {
          "internalType": "euint64",
          "name": "",
          "type": "bytes32"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint32",
          "name": "monthKey",
          "type": "uint32"
        }
      ],
      "name": "getMyMonthlyNet",
      "outputs": [
        {
          "internalType": "euint64",
          "name": "",
          "type": "bytes32"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "index",
          "type": "uint256"
        }
      ],
      "name": "getMyRecordAmount",
      "outputs": [
        {
          "internalType": "euint64",
          "name": "",
          "type": "bytes32"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "getMyRecordCount",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "index",
          "type": "uint256"
        }
      ],
      "name": "getMyRecordMeta",
      "outputs": [
        {
          "internalType": "bool",
          "name": "isIncome",
          "type": "bool"
        },
        {
          "internalType": "uint64",
          "name": "timestamp",
          "type": "uint64"
        },
        {
          "internalType": "string",
          "name": "tag",
          "type": "string"
        },
        {
          "internalType": "uint32",
          "name": "monthKey",
          "type": "uint32"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "protocolId",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "pure",
      "type": "function"
    }
  ]
} as const;

