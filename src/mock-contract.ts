import {
  BaseContract,
  Contract,
  FunctionFragment,
  Interface,
  InterfaceAbi,
  Signer,
} from "ethers";
import { Doppelganger__factory } from "../typechain-types";

// Matches viem.sh types for a call
export type MockReadCallExpectation = {
  kind: "read";
  abi: FunctionFragment;
  inputs: any[];
  outputs: any[];
};
export type MockRevertExpectation = {
  kind: "revert";
  abi: FunctionFragment;
  inputs: any[];
  reason?: string;
};
export type MockCallExpectation =
  | MockReadCallExpectation
  | MockRevertExpectation;

export type MockContract<C extends BaseContract> = C & {
  setup: (
    ...calls: MockCallExpectation[] // TODO: Infer types
  ) => Promise<void>;
};

export const deployMock = async <C extends BaseContract>(
  abi: InterfaceAbi,
  signer: Signer
) => {
  const mockDeployed = await new Doppelganger__factory(signer).deploy();
  const mock = new Contract(
    await mockDeployed.getAddress(),
    abi,
    signer
  ) as any as MockContract<C>;
  let firstCall = true;
  mock.setup = async (...calls: MockCallExpectation[]) => {
    for (const call of calls) {
      switch (call.kind) {
        case "read": {
          // Encode function call data using ethers v6:
          const iface = new Interface([call.abi]);
          const fnSigHash = iface.encodeFunctionData(call.abi, call.inputs);
          const encodedOutputs = iface.encodeFunctionResult(
            call.abi,
            call.outputs
          );
          // Use a mock function to return the expected return value
          if (firstCall) {
            await mockDeployed.__doppelganger__mockReturns(
              fnSigHash,
              encodedOutputs
            );
            firstCall = false;
          } else {
            await mockDeployed.__doppelganger__queueReturn(
              fnSigHash,
              encodedOutputs
            );
          }
          break;
        }
        case "revert": {
          const iface = new Interface([call.abi]);
          const fnSigHash = iface.encodeFunctionData(call.abi, call.inputs);
          if (firstCall) {
            await mockDeployed.__doppelganger__mockReverts(
              fnSigHash,
              call.reason || ""
            );
            firstCall = false;
          } else {
            await mockDeployed.__doppelganger__queueRevert(
              fnSigHash,
              call.reason || ""
            );
          }
          break;
        }
      }
    }
  };
  return mock as any as MockContract<C>;
};
