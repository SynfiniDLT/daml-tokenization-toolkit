package com.synfini.wallet.views.projection.events;

public class InstructionExecutionEvent {
  public final String instructionCid;

  public InstructionExecutionEvent(String instructionCid) {
    this.instructionCid = instructionCid;
  }
}
