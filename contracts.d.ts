import * as Web3 from "web3";
import * as BigNumber from "bignumber.js";

type Address = string;
type TransactionOptions = Partial<Transaction>;
type UInt = number | BigNumber.BigNumber;

interface Transaction {
  hash: string;
  nonce: number;
  blockHash: string | null;
  blockNumber: number | null;
  transactionIndex: number | null;
  from: Address | ContractInstance;
  to: string | null;
  value: UInt;
  gasPrice: UInt;
  gas: number;
  input: string;
}

interface ContractInstance {
  address: string;
  sendTransaction(options?: TransactionOptions): Promise<void>;
}

export interface BasicTokenInstance extends ContractInstance {
  totalSupply(options?: TransactionOptions): Promise<BigNumber.BigNumber>;
  balanceOf(
    owner: Address,
    options?: TransactionOptions
  ): Promise<BigNumber.BigNumber>;
  transfer(
    to: Address,
    value: UInt,
    options?: TransactionOptions
  ): Promise<boolean>;
}

export interface BookingInstance extends ContractInstance {
  createBooking(
    customer: Address,
    bookingId: UInt,
    bookingValue: UInt,
    isRefundable: boolean,
    supplier: Address,
    checkInEpochSeconds: UInt,
    checkOutEpochSeconds: UInt,
    options?: TransactionOptions
  ): Promise<boolean>;
  bookings(
    unnamed0: UInt,
    options?: TransactionOptions
  ): Promise<
    [
      BigNumber.BigNumber,
      BigNumber.BigNumber,
      boolean,
      BigNumber.BigNumber,
      Address,
      Address,
      BigNumber.BigNumber,
      BigNumber.BigNumber
    ]
  >;
  bookingProvider(options?: TransactionOptions): Promise<Address>;
  getBookingDetails(
    bookingId: UInt,
    options?: TransactionOptions
  ): Promise<
    [
      BigNumber.BigNumber,
      BigNumber.BigNumber,
      boolean,
      BigNumber.BigNumber,
      Address,
      Address,
      BigNumber.BigNumber,
      BigNumber.BigNumber
    ]
  >;
  payForBooking(
    bookingId: UInt,
    options?: TransactionOptions
  ): Promise<boolean>;
}
