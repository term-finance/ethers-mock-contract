/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  BaseContract,
  Contract,
  FunctionFragment,
  Interface,
  InterfaceAbi,
  Signer,
} from "ethers";
import {
  deployMock,
  MockCallExpectation,
  MockContract as NewMockContract,
} from "../mock-contract";
import { Doppelganger } from "../../typechain-types";

// type ABI = string | Array<Fragment | JsonFragment | string>;
type ABI = InterfaceAbi;

interface StubInterface extends Pick<Promise<void>, "then"> {
  returns(...args: any): StubInterface;
  reverts(): StubInterface;
  revertsWithReason(reason: string): StubInterface;
  withArgs(...args: any[]): StubInterface;
}

export interface MockContract<T extends BaseContract = BaseContract>
  extends BaseContract {
  mock: {
    [key in keyof T | "receive"]: StubInterface;
  };
  call(
    contract: Contract,
    functionName: string,
    ...params: any[]
  ): Promise<any>;
  staticcall(
    contract: Contract,
    functionName: string,
    ...params: any[]
  ): Promise<any>;
}

class Stub implements StubInterface {
  calls: MockCallExpectation[] = [];
  inputs: any[] | undefined = undefined;

  revertSet = false;
  argsSet = false;

  constructor(
    private mockContract: NewMockContract<BaseContract>,
    private func: FunctionFragment,
  ) {}

  private err(reason: string): never {
    this.revertSet = false;
    this.argsSet = false;
    throw new Error(reason);
  }

  returns(...args: any) {
    if (this.revertSet) this.err("Revert must be the last call");
    if (!this.func.outputs)
      this.err("Cannot mock return values from a void function");

    this.calls.push({
      kind: "read",
      abi: this.func,
      inputs: this.inputs,
      outputs: args,
    });

    return this;
  }

  reverts() {
    if (this.revertSet) this.err("Revert must be the last call");

    this.calls.push({
      kind: "revert",
      abi: this.func,
      inputs: this.inputs,
      reason: "Mock revert",
    });

    this.revertSet = true;
    return this;
  }

  revertsWithReason(reason: string) {
    if (this.revertSet) this.err("Revert must be the last call");

    this.calls.push({
      kind: "revert",
      abi: this.func,
      inputs: this.inputs,
      reason,
    });

    this.revertSet = true;
    return this;
  }

  withArgs(...params: any[]) {
    if (this.argsSet) this.err("withArgs can be called only once");
    this.inputs = params;
    this.argsSet = true;
    return this;
  }

  async then<TResult1 = void, TResult2 = never>(
    resolve?:
      | ((value: void) => TResult1 | PromiseLike<TResult1>)
      | null
      | undefined,
    reject?:
      | ((reason: any) => TResult2 | PromiseLike<TResult2>)
      | null
      | undefined,
  ): Promise<TResult1 | TResult2> {
    if (this.argsSet) {
      this.calls.push({
        kind: "write",
        abi: this.func,
        inputs: this.inputs,
      });
    }

    try {
      await this.mockContract.setup(...this.calls);
    } catch (e) {
      this.argsSet = false;
      this.revertSet = false;
      reject?.(e);
      return undefined as never;
    }
    this.argsSet = false;
    this.revertSet = false;
    resolve?.();
    return undefined as never;
  }
}

type DeployOptions = {
  address: string;
  override?: boolean;
};

function createMock<T extends BaseContract>(
  abi: ABI,
  mockContractInstance: NewMockContract<Doppelganger>,
): MockContract<T>["mock"] {
  const iface = Interface.from(abi);
  const functions = iface.fragments.filter(
    (f) => f.type === "function",
  ) as FunctionFragment[];
  const mockedAbi = Object.values(functions).reduce(
    (acc, func) => {
      const stubbed = new Stub(mockContractInstance, func);
      return {
        ...acc,
        [func.name]: stubbed,
        [func.format()]: stubbed,
      };
    },
    {} as MockContract<T>["mock"],
  );

  (mockedAbi as any).receive = {
    returns: () => {
      throw new Error("Receive function return is not implemented.");
    },
    withArgs: () => {
      throw new Error("Receive function return is not implemented.");
    },
    reverts: () =>
      mockContractInstance.__doppelganger__receiveReverts("Mock Revert"),
    revertsWithReason: (reason: string) =>
      mockContractInstance.__doppelganger__receiveReverts(reason),
  };

  return mockedAbi;
}

export async function deployMockContract<T extends BaseContract = BaseContract>(
  signer: Signer,
  abi: ABI,
  deployOptions?: DeployOptions,
): Promise<MockContract<T> & T> {
  if (deployOptions) {
    throw new Error(
      "Deploy options are not supported for mock contracts waffle compatability mode",
    );
  }

  const mockContractInstance = await deployMock<T>(abi, signer);

  const mock = createMock<T>(
    abi,
    mockContractInstance as unknown as NewMockContract<Doppelganger>,
  );
  const mockedContract = new Contract(
    await mockContractInstance.getAddress(),
    abi,
    signer,
  ) as unknown as MockContract<T>;
  mockedContract.mock = mock;

  mockedContract.staticcall = async (
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    contract: Contract,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    functionName: string,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    ...params: any[]
  ) => {
    throw new Error("Staticcall is not supported in waffle compatability mode");
  };

  mockedContract.call = async (
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    contract: Contract,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    functionName: string,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    ...params: any[]
  ) => {
    throw new Error("Call is not supported in waffle compatability mode");
  };

  return mockedContract as MockContract<T> & T;
}
