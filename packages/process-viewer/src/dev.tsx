// Copyright (C) 2026 Piovium Labs
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as
// published by the Free Software Foundation, either version 3 of the
// License, or (at your option) any later version.

/* @refresh reload */

import { render } from "solid-js/web";

import { SettlementFlowViewer } from "./SettlementFlowViewer";
import "./style.css";

render(
  () => <SettlementFlowViewer />,
  document.getElementById("root") as HTMLElement,
);
