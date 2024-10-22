// Copyright (c) 2024 ASX Operations Pty Ltd. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { AccountOpenOfferSummary } from "@synfini/wallet-views";
import AccountOfferDetails from "./accountOfferDetails";

export default function AccountOffers(props: { accountOffers?: AccountOpenOfferSummary[]}) {
  return (
    <div style={{ margin: "10px", padding: "10px" }}>
      {
        props.accountOffers !== undefined &&
        props.accountOffers.map(accountOffer =>
          <div key={accountOffer.cid}>
            <AccountOfferDetails accountOffer={accountOffer} />
          </div>
        )
      }
    </div>
  );
}
