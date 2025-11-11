export function errorNotDeployed(chainId: number | undefined) {
  return (
    <div className="min-h-screen flex items-center justify-center p-8">
      <div className="max-w-4xl bg-white/95 backdrop-blur-sm rounded-3xl shadow-2xl p-12">
        <div className="text-center mb-8">
          <div className="text-8xl mb-4">⚠️</div>
          <h1 className="text-4xl font-bold text-red-600 mb-2">Contract Not Deployed</h1>
        </div>

        <div className="bg-red-50 border-2 border-red-300 rounded-2xl p-6 mb-8">
          <p className="text-xl text-gray-900 leading-relaxed">
            The <span className="font-mono font-bold bg-yellow-200 px-2 py-1 rounded">PrivateBills.sol</span> contract
            is not deployed on{" "}
            <span className="font-mono font-bold bg-yellow-200 px-2 py-1 rounded">chainId={chainId}</span>{" "}
            {chainId === 11155111 ? "(Sepolia)" : ""} or the deployment address is missing.
          </p>
        </div>

        <div className="space-y-6">
          <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-2xl p-6 border-2 border-blue-200">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">📋 Instructions</h2>
            <p className="text-lg text-gray-700 mb-4">
              The <span className="font-mono font-bold bg-white px-2 py-1 rounded border border-gray-300">PrivateBills.sol</span> contract
              has either not been deployed yet, or the deployment address is missing
              from the ABI directory{" "}
              <span className="font-mono bg-white px-2 py-1 rounded border border-gray-300">PrivateBills/frontend/abi</span>.
            </p>
            <p className="text-lg text-gray-700">
              To deploy <span className="font-mono font-bold bg-white px-2 py-1 rounded border border-gray-300">PrivateBills.sol</span>,
              run the following command:
            </p>
          </div>

          <div className="bg-gray-900 rounded-2xl p-6 shadow-xl">
            <p className="text-sm text-yellow-400 mb-2 italic"># from PrivateBills/backend</p>
            <p className="font-mono text-lg text-white">
              npx hardhat deploy --network {chainId === 11155111 ? "sepolia" : "your-network-name"}
            </p>
          </div>

          <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-6 border-2 border-green-200">
            <h2 className="text-xl font-bold text-gray-900 mb-3">💡 Alternative Solution</h2>
            <p className="text-lg text-gray-700">
              You can also switch to the local{" "}
              <span className="font-mono font-bold bg-white px-2 py-1 rounded border border-gray-300">Hardhat Node</span>{" "}
              using the MetaMask browser extension.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}


