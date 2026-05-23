// Copyright (C) 2025 Guyutongxue & CherryC9H13N
// Copyright (C) 2026 Piovium Labs
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as
// published by the Free Software Foundation, either version 3 of the
// License, or (at your option) any later version.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU Affero General Public License for more details.
//
// You should have received a copy of the GNU Affero General Public License
// along with this program.  If not, see <http://www.gnu.org/licenses/>.

import {
  createSignal,
  type Component,
  type JSX,
} from "solid-js";

export interface AlertController {
  show: (content: JSX.Element) => void;
  hide: () => void;
}

export const createAlert = (): [
  controller: AlertController,
  component: Component,
] => {
  const [showAlert, setShowAlert] = createSignal(false);
  const [content, setContent] = createSignal<JSX.Element>();

  let autoHideTimeout: number | null = null;

  const show = (content: JSX.Element) => {
    setShowAlert(false); // retrigger animation
    window.setTimeout(() => {
      setContent(content);
      setShowAlert(true);
      if (autoHideTimeout) {
        window.clearTimeout(autoHideTimeout);
      }
      autoHideTimeout = window.setTimeout(() => {
        setShowAlert(false);
        autoHideTimeout = null;
      }, 4000);
    }, 0);
  };

  const hide = () => {
    setShowAlert(false);
  };

  return [
    {
      show,
      hide,
    },
    () => (
      <Alert shown={showAlert()} onBackdropClick={hide}>
        {content()}
      </Alert>
    ),
  ];
};

interface AlertProps {
  shown: boolean;
  class?: string;
  children?: JSX.Element;
  onBackdropClick?: () => void;
}

function Alert(props: AlertProps) {
  return (
    <div
      class="z-7 hidden data-[shown]:flex w-full h-full bg-black/50 items-center justify-center"
      bool:data-shown={props.shown}
      onClick={() => props.onBackdropClick?.()}
    >
      <div
        class={`w-90 p-4 pointer-events-none select-none
          font-bold text-#ede4d8 text-4.5 text-center
          bg-#786049 border-#bea678 b-3 rounded-1.5
          alert-auto-hide ${ props.class ?? "" }`}
      >
        {props.children}
      </div>
    </div>
  );
}
