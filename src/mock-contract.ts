import {
  BaseContract,
  Contract,
  FunctionFragment,
  Interface,
  InterfaceAbi,
  Signer,
  solidityPacked,
} from "ethers";
import { Doppelganger__factory } from "../typechain-types";
import { AbiParametersToPrimitiveTypes } from "abitype";

// Matches viem.sh types for a call. Type parameter T is the type of the function that will be called.
export type MockReadCallExpectation<T extends FunctionFragment> = {
  kind: "read";
  abi: T;
  // Lookup the
  inputs?: AbiParametersToPrimitiveTypes<T["inputs"]>;
  outputs: AbiParametersToPrimitiveTypes<T["outputs"]>;
};
export type MockWriteCallExpectation<T extends FunctionFragment> = {
  kind: "write";
  abi: T;
  inputs?: AbiParametersToPrimitiveTypes<T["inputs"]>;
};
export type MockRevertExpectation<T extends FunctionFragment> = {
  kind: "revert";
  abi: T;
  inputs?: AbiParametersToPrimitiveTypes<T["inputs"]>;
  reason?: string;
};
export type MockCallExpectation<T extends FunctionFragment = FunctionFragment> =

    | MockReadCallExpectation<T>
    | MockWriteCallExpectation<T>
    | MockRevertExpectation<T>;

export type MockContract<C extends BaseContract> = C & {
  setup: (
    ...calls: MockCallExpectation[] // TODO: Infer types
  ) => Promise<void>;
};

export const calculateFnSigHash = (
  call:
    | MockRevertExpectation<FunctionFragment>
    | MockReadCallExpectation<FunctionFragment>
    | MockWriteCallExpectation<FunctionFragment>,
) => {
  try {
    const iface = new Interface([call.abi]);
    if (call.inputs === undefined || call.inputs === null) {
      const selector = iface.getFunction(call.abi.name)?.selector;
      if (!selector) {
        throw new Error("Could not find function selector");
      }
      return selector;
    }
    return iface.encodeFunctionData(call.abi, call.inputs);
  } catch (e) {
    const err = e as Error;
    err.message = `[${call.abi.format("minimal")}]: ${err.message}`;
    throw err;
  }
};

export const deployMock = async <C extends BaseContract>(
  abi: InterfaceAbi,
  signer: Signer,
) => {
  const mockDeployed = await new Doppelganger__factory(signer).deploy();
  const mock = new Contract(
    await mockDeployed.getAddress(),
    abi,
    signer,
  ) as unknown as MockContract<C>;
  let firstCall = true;
  mock.setup = async (...calls: MockCallExpectation[]) => {
    for (const call of calls) {
      switch (call.kind) {
        case "read": {
          // Encode function call data using ethers v6:
          const iface = new Interface([call.abi]);
          const fnSigHash = calculateFnSigHash(call);
          let encodedOutputs: string;
          try {
            encodedOutputs = iface.encodeFunctionResult(call.abi, call.outputs);
          } catch (e) {
            const err = e as Error;
            err.message = `[${call.abi.format("minimal")}]: ${err.message}`;
            throw err;
          }
          // Use a mock function to return the expected return value
          if (firstCall) {
            await mockDeployed.__doppelganger__mockReturns(
              fnSigHash,
              encodedOutputs,
            );
            firstCall = false;
          } else {
            await mockDeployed.__doppelganger__queueReturn(
              fnSigHash,
              encodedOutputs,
            );
          }
          break;
        }
        case "write": {
          const fnSigHash = calculateFnSigHash(call);
          if (firstCall) {
            await mockDeployed.__doppelganger__mockReturns(
              fnSigHash,
              solidityPacked([], []),
            );
            firstCall = false;
          } else {
            await mockDeployed.__doppelganger__queueReturn(
              fnSigHash,
              solidityPacked([], []),
            );
          }
          break;
        }
        case "revert": {
          const fnSigHash = calculateFnSigHash(call);
          if (firstCall) {
            await mockDeployed.__doppelganger__mockReverts(
              fnSigHash,
              call.reason || "",
            );
            firstCall = false;
          } else {
            await mockDeployed.__doppelganger__queueRevert(
              fnSigHash,
              call.reason || "",
            );
          }
          break;
        }
      }
    }
  };
  return mock as unknown as MockContract<C>;
};
