import { BookingInstance } from "../contracts";

import * as chai from 'chai';
import * as dirtyChai from 'dirty-chai';

import ChaiBigNumber = require('chai-bignumber');
import chaiAsPromised = require('chai-as-promised');
import { latestBlockTime } from "./helpers/latestBlockTime";

export const chaiSetup = {
    configure() {
        chai.config.includeStack = true;
        chai.use(ChaiBigNumber(web3.BigNumber));
        chai.use(dirtyChai);
        chai.use(chaiAsPromised);
    },
};
chaiSetup.configure();

const expect = chai.expect;

const Booking = artifacts.require("Booking");

contract("Booking", function([agent, customer, supplier, dummy]) {

  const advanceBlock = async() => {
    return new Promise((resolve, reject) => {
      web3.currentProvider.sendAsync(
        {
          jsonrpc: "2.0",
          method: "evm_mine",
          id: Date.now()
        },
        (err, res) => {
          return err ? reject(err) : resolve(res);
        }
      );
    });
  }

  const timer = async (s: any) => {
    return new Promise((resolve, reject) => {
      web3.currentProvider.sendAsync(
        {
          jsonrpc: "2.0",
          method: "evm_increaseTime",
          params: [s], // 60 seaconds, may need to be hex, I forget
          id: Math.floor(Math.random() * 10000000) // Id of the request; anything works, really
        },
        function(err) {
          if (err) return reject(err);
          resolve();
        }
      );
    });
  };
  const ONE_DAY_SECONDS = 60 * 60 * 24;
  const MAX_GAS = web3.toWei(1, "ether"); 

  let booking: BookingInstance;
  let bookingId = new web3.BigNumber(0);
  let checkOutEpochSeconds = latestBlockTime() + (2 * ONE_DAY_SECONDS);

  const bookingValueEth = 1;
  const commissionValueEth = 0.1;
  const bookingValue = new web3.BigNumber(web3.toWei(bookingValueEth, "ether"));
  const commissionValue = new web3.BigNumber(web3.toWei(commissionValueEth, "ether"));

  beforeEach(async() => {
    bookingId = bookingId.plus(1);
    booking = await Booking.new();
    checkOutEpochSeconds = latestBlockTime() + (2 * ONE_DAY_SECONDS);
    await booking.createBooking(
      bookingId, 
      bookingValue, 
      commissionValue, 
      customer, 
      supplier, 
      checkOutEpochSeconds);
  });

  describe('createing a booking', () => {
    it('succeeds when the booking does not exist', async () => {
      const bookingResult = await booking.getBookingDetails.call(bookingId);
      console.log("booking: " + JSON.stringify(bookingResult));
      expect(bookingResult[0]).to.be.bignumber.equal(bookingId);
      expect(bookingResult[1]).to.be.bignumber.equal(bookingValue);
      expect(bookingResult[2]).to.be.bignumber.equal(commissionValue);
      expect(bookingResult[3]).to.be.bignumber.equal(0);
      expect(bookingResult[4]).to.equal(customer);
      expect(bookingResult[5]).to.equal(supplier);
      expect(bookingResult[6]).to.be.bignumber.equal(checkOutEpochSeconds);
    });

    it('fails when the booking already exists', async () => {
      try {
        await booking.createBooking(
          bookingId, 
          bookingValue, 
          commissionValue, 
          customer, 
          supplier, 
          checkOutEpochSeconds);
      } catch(error) {
        expect(error.message).to.have.string('invalid opcode');
        return;
      }
      assert.fail(null, null, 'Expected invalid opcode');
    });
  });


  describe('pay for a booking', () => {
    it("allows the customer to pay for the booking", async () => {
      await booking.payForBooking(bookingId ,{from: customer, value: bookingValue});
      const bookingResult = await booking.getBookingDetails.call(bookingId);
      expect(bookingResult[3]).to.be.bignumber.equal(1);
    });

    it('decreases the customer account correctly', async () => {
      const customerAmountBeforePayment = web3.eth.getBalance(customer);
      const result: any = await booking.payForBooking(bookingId ,{from: customer, value: bookingValue});
      const gasPrice = web3.eth.getTransaction(result.tx).gasPrice.toNumber();
      const gasUsed = result.receipt.gasUsed;
      const gas = gasUsed * gasPrice;
      const customerAmountAfterPayment = web3.eth.getBalance(customer);
      const customerDifference = customerAmountBeforePayment.minus(customerAmountAfterPayment);
      const customerDifferenceLessGas = customerDifference.minus(gas);
      expect(customerDifferenceLessGas).to.be.bignumber.equal(bookingValue);
    });

    it('increase the contract value correctly', async () => {
      const initialBalance = web3.eth.getBalance(booking.address);
      await booking.payForBooking(bookingId ,{from: customer, value: bookingValue});
      const finalBalance = web3.eth.getBalance(booking.address);
      expect(finalBalance.minus(initialBalance)).to.be.bignumber.equal(bookingValue);
    })

    it("fails if the booking is already booked", async () => {
      await booking.payForBooking(bookingId ,{from: customer, value: bookingValue});
      try {
        await booking.payForBooking(bookingId ,{from: customer, value: bookingValue});
      } catch(error) {
        expect(error.message).to.have.string('invalid opcode');
        return;
      }
      assert.fail(null, null, 'Expected invalid opcode')
    });

    it('fails when the customer does not have enough money', async () => {
      const totalPossiblePayment = bookingValue.plus(MAX_GAS);
      const customerInitialBalance = web3.eth.getBalance(customer);
      const amountToTransfer = customerInitialBalance.minus(totalPossiblePayment); 
      web3.eth.sendTransaction({ from: customer, to: dummy, value: amountToTransfer});
      try {
        await booking.payForBooking(bookingId ,{from: customer, value: bookingValue});
      } catch(error) {
        expect(error.message).to.have.string("sender doesn't have enough funds to send tx");
        return;
      } finally {
        web3.eth.sendTransaction({ from: dummy, to: customer, value: amountToTransfer});
      }
      assert.fail(null, null, "Expected error with sender doesn't have enough funds to send tx");
    });

    it('fails when the customer is not the sender', async() => {
      try {
        await booking.payForBooking(bookingId ,{from: supplier});
      } catch(error) {
        expect(error.message).to.have.string('invalid opcode');
        return;
      }
      assert.fail(null, null, 'Expected invalid opcode')
    });

  });

  describe('draw down a booking', () => {
    // when the booking hasn't been paid for
    // when the booking is already finalised
    // when the booking is cancelled

    describe('when the booking is not past the finalised date', () =>{
      beforeEach(async () => {
        await booking.payForBooking(bookingId ,{from: customer, value: bookingValue});
      });
      it('fails', async () => {
        try {
          await booking.drawDown(bookingId);
        } catch(error) {
          expect(error.message).to.have.string('invalid opcode');
          return;
        }
        assert.fail(null, null, 'Expected invalid opcode')
      });
    });

    describe('when the booking is has past the finalised date', () =>{
      beforeEach(async () => {
        await booking.payForBooking(bookingId ,{from: customer, value: bookingValue});
        timer(2 * ONE_DAY_SECONDS);
        await advanceBlock();
      });

      it('should increase the supplier account by net amount', async () => {
        const supplierBefore = web3.eth.getBalance(supplier);
        await booking.drawDown(bookingId);
        const supplierAfter = web3.eth.getBalance(supplier);
        const supplierDifference = web3.fromWei(supplierAfter.minus(supplierBefore), "ether");
        expect(supplierDifference).to.be.bignumber.equal(bookingValueEth - commissionValueEth);
      });

      it('should increase the agent account by commission amount', async () => {
        const agentBefore = web3.eth.getBalance(agent);
        await booking.drawDown(bookingId, {from: supplier});
        const agentAfter = web3.eth.getBalance(agent);
        const agentDifference = web3.fromWei(agentAfter.minus(agentBefore), "ether");
        expect(agentDifference).to.be.bignumber.equal(commissionValueEth);
      });
    })
  });
  
  describe('balances of a booking', () => {
    describe('when the booking is created', () => {
      it('should be zero for the agent', async () => {
        const balance = await booking.balanceOf.call(bookingId);
        console.log(balance);
        expect(balance).to.be.bignumber.equal(0);
      });
      it('should be zero for the customer', async () => {
        const balance = await booking.balanceOf.call(bookingId, {from: customer});
        console.log(balance);
        expect(balance).to.be.bignumber.equal(0);
      });
      it('should be zero for the supplier', async () => {
        const balance = await booking.balanceOf.call(bookingId, {from: supplier});
        console.log(balance);
        expect(balance).to.be.bignumber.equal(0);
      });
    });

    describe('when the booking has been paid for', () => {
      beforeEach(async() => {
        await booking.payForBooking(bookingId ,{from: customer, value: bookingValue});
      });
      it('should be booking value for the customer', async () => {
        const balance = await booking.balanceOf.call(bookingId, {from: customer});
        console.log(balance.toString());
        expect(balance).to.be.bignumber.equal(bookingValue);
      });
      it('should be zero for the agent', async () => {
        const balance = await booking.balanceOf.call(bookingId);
        console.log(balance);
        expect(balance).to.be.bignumber.equal(0);
      });
      it('should be zero for the supplier', async () => {
        const balance = await booking.balanceOf.call(bookingId, {from: supplier});
        console.log(balance);
        expect(balance).to.be.bignumber.equal(0);
      });
    });

    describe('when the booking has been finalized', () =>{
      beforeEach(async() => {
        await booking.payForBooking(bookingId ,{from: customer, value: bookingValue});
        timer(2 * ONE_DAY_SECONDS);
        await advanceBlock();
      });
      it('should be zero for the customer', async () => {
        const balance = await booking.balanceOf.call(bookingId, {from: customer});
        expect(balance).to.be.bignumber.equal(0);
      });
      it('should be commission value for the agent', async () => {
        const balance = await booking.balanceOf.call(bookingId);
        expect(balance).to.be.bignumber.equal(commissionValue);
      });
      it('should be bookingValue minus commission for the supplier', async () => {
        const balance = await booking.balanceOf.call(bookingId, {from: supplier});
        expect(balance).to.be.bignumber.equal(bookingValue.minus(commissionValue));
      });

    });
    
    describe('when the booking has been drawnDown', () =>{
      beforeEach(async() => {
        await booking.payForBooking(bookingId ,{from: customer, value: bookingValue});
        timer(2 * ONE_DAY_SECONDS);
        await advanceBlock();
        await booking.drawDown(bookingId);
      });
      it('should be zero for the customer', async () => {
        const balance = await booking.balanceOf.call(bookingId, {from: customer});
        expect(balance).to.be.bignumber.equal(0);
      });
      it('should be zero for the agent', async () => {
        const balance = await booking.balanceOf.call(bookingId);
        expect(balance).to.be.bignumber.equal(0);
      });
      it('should be zero for the supplier', async () => {
        const balance = await booking.balanceOf.call(bookingId, {from: supplier});
        expect(balance).to.be.bignumber.equal(0);
      });
    });
  });
});
