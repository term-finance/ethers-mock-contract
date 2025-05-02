export {
  MockReadCallExpectation,
  MockWriteCallExpectation,
  MockRevertExpectation,
  MockCallExpectation,
  MockContract,
  deployMock,
} from "./mock-contract";

export { type MockContract as MockWaffleContract, deployMockContract } from "./compat/waffle.js";
