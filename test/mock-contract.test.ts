import { expect } from "chai";
import { deployMock } from "../src/mock-contract";
import {
  BaseContract,
  FunctionFragment,
  Interface,
  InterfaceAbi,
  ZeroAddress,
} from "ethers";
import hre from "hardhat";

const erc20ABI = [
  {
    type: "function",
    name: "balanceOf",
    stateMutability: "view",
    inputs: [{ type: "address" }],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "function",
    name: "decimals",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint8" }],
  },
  {
    type: "function",
    name: "transfer",
    stateMutability: "nonpayable",
    inputs: [{ type: "address" }, { type: "uint256" }],
    outputs: [],
  },
  {
    type: "event",
    name: "Transfer",
    inputs: [{ type: "address" }, { type: "address" }, { type: "uint256" }],
    anonymous: false,
  },
] as InterfaceAbi;

type Erc20Contract = BaseContract & {
  balanceOf: (address: string) => Promise<bigint>;
  decimals: () => Promise<number>;
  transfer: (to: string, amount: bigint) => Promise<void>;
};

describe("Doppelganger", function () {
  describe("Deployment", function () {
    it("Should allow for the mocking of read calls", async function () {
      const [signer] = await hre.ethers.getSigners();
      const mock = await deployMock<Erc20Contract>(erc20ABI, signer);
      console.log(`Deployed mock at ${await mock.getAddress()}`);

      await mock.setup({
        kind: "read",
        abi: FunctionFragment.from(erc20ABI[0]),
        inputs: [ZeroAddress],
        outputs: [100n],
      });

      expect(await mock.balanceOf(ZeroAddress)).to.equal(100n);
    });

    it("Should allow for the mocking of write calls", async function () {
      const [signer] = await hre.ethers.getSigners();
      const mock = await deployMock<Erc20Contract>(erc20ABI, signer);
      await mock.setup({
        kind: "write",
        abi: FunctionFragment.from(erc20ABI[2]),
        inputs: [ZeroAddress, 100n],
      });

      await mock.transfer(ZeroAddress, 100n);
    });

    it("Should allow for the mocking of reverts on read calls", async function () {
      const [signer] = await hre.ethers.getSigners();
      const mock = await deployMock<Erc20Contract>(erc20ABI, signer);
      await mock.setup({
        kind: "revert",
        abi: FunctionFragment.from(erc20ABI[0]),
        inputs: [ZeroAddress],
        reason: "Mock revert",
      });

      try {
        await mock.balanceOf(ZeroAddress);
      } catch (error) {
        expect((error as Error).message).to.contain("Mock revert");
      }
    });

    it("Should fail if the mock is not set up", async function () {
      const [signer] = await hre.ethers.getSigners();
      const mock = await deployMock<Erc20Contract>(erc20ABI, signer);

      try {
        await mock.balanceOf(ZeroAddress);
      } catch (error) {
        expect((error as Error).message).to.contain(
          "Mock on the method is not initialized",
        );
      }
    });

    it("Should allow undefined call.inputs for read calls", async function () {
      const [signer] = await hre.ethers.getSigners();
      const mock = await deployMock<Erc20Contract>(erc20ABI, signer);
      await mock.setup({
        kind: "read",
        abi: Interface.from(erc20ABI).getFunction("balanceOf")!,
        outputs: [20998n],
      });

      expect(await mock.balanceOf(ZeroAddress)).to.equal(20998n);
    });

    // TODO:
    it.skip("Should allow for the mocking of events", async function () {});
  });
});
