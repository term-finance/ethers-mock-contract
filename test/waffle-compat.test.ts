import { expect } from "chai";
import { deployMockContract } from "../src/compat/waffle";
import { BaseContract, InterfaceAbi, ZeroAddress } from "ethers";
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

describe("waffle", function () {
  describe("compat", function () {
    it("Should allow for the mocking of read calls", async function () {
      const [signer] = await hre.ethers.getSigners();
      const mock = await deployMockContract<Erc20Contract>(signer, erc20ABI);
      console.log(`Deployed mock at ${await mock.getAddress()}`);

      await mock.mock.balanceOf.withArgs(ZeroAddress).returns(100n);

      expect(await mock.balanceOf(ZeroAddress)).to.equal(100n);
    });

    it("Should allow for the mocking of write calls", async function () {
      const [signer] = await hre.ethers.getSigners();
      const mock = await deployMockContract<Erc20Contract>(signer, erc20ABI);

      await mock.mock.transfer.withArgs(ZeroAddress, 100n);

      await mock.transfer(ZeroAddress, 100n);
    });

    it("Should allow for the mocking of reverts on read calls", async function () {
      const [signer] = await hre.ethers.getSigners();
      const mock = await deployMockContract<Erc20Contract>(signer, erc20ABI);

      await mock.mock.balanceOf
        .withArgs(ZeroAddress)
        .revertsWithReason("Custom reason");

      try {
        await mock.balanceOf(ZeroAddress);
      } catch (error) {
        expect((error as Error).message).to.contain("Custom reason");
      }
    });

    it("Should fail if the mock is not set up", async function () {
      const [signer] = await hre.ethers.getSigners();
      const mock = await deployMockContract<Erc20Contract>(signer, erc20ABI);

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
      const mock = await deployMockContract<Erc20Contract>(signer, erc20ABI);

      await mock.mock.balanceOf.returns(20998n);

      expect(await mock.balanceOf(ZeroAddress)).to.equal(20998n);
    });
  });
});
