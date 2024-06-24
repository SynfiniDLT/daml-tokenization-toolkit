// Copyright (c) 2024 ASX Operations Pty Ltd. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { AccountSummary } from "@synfini/wallet-views";
import { useWalletViews } from "../../App";
import { Id, InstrumentKey } from "@daml.js/daml-finance-interface-types-common/lib/Daml/Finance/Interface/Types/Common/Types";
import * as damlTypes from "@daml/types";
import { useEffect, useState } from "react";

interface AccountsSelectProps {
  accounts?: AccountSummary[];
  instrument: InstrumentKey;
  onChange: React.ChangeEventHandler<HTMLSelectElement>;
  selectedAccount: string;
  disabled: boolean
}

export default function AccountsSelect(props: AccountsSelectProps) {
  const walletClient = useWalletViews();
  const [balancesMap, setBalancesMap] = useState<damlTypes.Map<Id, damlTypes.Decimal>>(damlTypes.emptyMap());

  useEffect(() => {
    (props.accounts || []).forEach(async account => {
      // TODO need to add additional filter by instrument on this endpoint, so that client-side filtering is not needed
      const bals =  await walletClient.getBalance({account: account.view });
      const bal = bals.find(b =>
        b.instrument.depository === props.instrument.depository &&
        b.instrument.issuer === props.instrument.issuer &&
        b.instrument.id.unpack === props.instrument.id.unpack &&
        b.instrument.version === props.instrument.version
      );
      setBalancesMap(m => m.set(account.view.id, bal?.unlocked || "0.0"));
    });
  }, [walletClient, props.accounts, props.instrument]);

  return (
    <div>
      {
        props.accounts !== undefined &&
        <select name="accountSelect" onChange={props.onChange} value={props.selectedAccount} disabled={props.disabled}>
          <option value="" defaultValue="">Select one account</option>
          {
            props.accounts.map(account =>
              <option value={account.view.id.unpack} key={account.cid}>
                {account.view.description} ({account.view.id.unpack}) - Available: {balancesMap.get(account.view.id) || "..."}
              </option>
            )
          }
        </select>
      }
    </div>
  );
}
