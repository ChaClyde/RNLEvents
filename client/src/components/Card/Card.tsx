import type { FC } from "react";

interface CardProps {
  image: string;
  title: string;
  description: string;
  onClick?: () => void;
}

const Card: FC<CardProps> = ({ image, title, description, onClick }) => {
  return (
    <div className="max-w-sm rounded-xl border border-gray-200 bg-white shadow-md overflow-hidden transition hover:shadow-xl hover:-translate-y-1 duration-300">
      <img src={image} alt={title} className="h-52 w-full object-cover" />

      <div className="p-5">
        <h5 className="mb-2 text-xl font-semibold text-gray-900">{title}</h5>

        <p className="mb-4 text-gray-600">{description}</p>

        <button
          onClick={onClick}
          className="inline-flex items-center rounded-lg bg-blue-600 px-4 py-2 text-white transition hover:bg-blue-700"
        >
          Select
          <svg
            className="ml-2 h-4 w-4"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <path
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 12H5m14 0-4 4m4-4-4-4"
            />
          </svg>
        </button>
      </div>
    </div>
  );
};

export default Card;
