# `@term-finance/ethers-mock-contract`

This project adds the ability to deploy a mock contract to the blockchain using
the `hardhat-ethers` plugin for `hardhat`.

## Installation

To install this project, run the following commands:

`npm`:

```shell
npm install --save-dev @term-finance/ethers-mock-contract
```

`yarn`:

```shell
yarn add --dev @term-finance/ethers-mock-contract
```

## Usage

To use this project, add the following to your `hardhat.config.js`:

```javascript
require("@term-finance/ethers-mock-contract");
```

Then, you can write tests that deploy a mock contract to the blockchain:

```typescript
import hre from "hardhat";
import { deployMock } from "@term-finance/ethers-mock-contract";

describe("MyContract", () => {
  it("should deploy a mock contract", async () => {
    const [signer] = await hre.ethers.getSigners();
    const mockContract = await deployMock(abi, signer);

    // Add expectations to mock
    await deployMock.setup(
      {
        kind: "read",
        abi: abi[0],
        inputs: [1n, 2n],
        outputs: [3n],
      },
      {
        kind: "revert",
        abi: abi[1],
        inputs: [2n, 3n],
        reason: "revert reason",
      },
      // ...
    );

    // Call the mock contract
    const result = await mockContract.myFunction1(1, 2);

    // Check the result
    expect(result).to.equal(3);

    // Check for a revert
    try {
      await mockContract.myFunction2(1, 2);
      assert.fail("Expected revert");
    } catch (error) {
      expect(error.message).to.contain("revert reason");
    }
  });
});
```

## Testing

To run the tests, run the following command:

```shell
yarn install
yarn test
```
