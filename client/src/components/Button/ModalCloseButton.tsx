import type { FC } from "react";

interface ModalCloseButtonProps {
  onClose: () => void;
}

const ModalCloseButton: FC<ModalCloseButtonProps> = ({ onClose }) => {
  return (
    <button
      type="button"
      onClick={onClose}
      className="absolute right-4 top-4 z-999 flex h-9.5 w-9.5 items-center
            justify-center rounded-full bg-white
                    hover:bg-gray-200
                    border border-gray-200
            sm:w-11 cursor-pointer"
    >
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M6.04289 16.5413C5.65237 16.9318 5.65237 17.565 6.04289 17.9555C6.43342 18.346 7.06658 18.346 7.45711 17.9555L11.9987 13.4139L16.5404 17.9555C16.9309 18.346 17.5641 18.346 17.9546 17.9555C18.3451 17.565 18.3451 16.9318 17.9546 16.5413L13.413 12L17.9546 7.45841C18.3451 7.06788 18.3451 6.43472 17.9546 6.04419C17.5641 5.65367 16.9309 5.65367 16.5404 6.04419L11.9987 10.5858L7.45711 6.04419C7.06658 5.65367 6.43342 5.65367 6.04289 6.04419C5.65237 6.43472 5.65237 7.06788 6.04289 7.45841L10.5845 12L6.04289 16.5413Z"
          fill="currentColor"
        />
      </svg>
    </button>
  );
};

export default ModalCloseButton;
