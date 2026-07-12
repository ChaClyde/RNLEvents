import type { FC } from "react";
import FloatingLabelInput from "../../../components/Input/FloatingLabelInput";
import Modal from "../../../components/Modal";
import FloatingLabelSelect from "../../../components/Select/FloatingLabelSelect";
import SubmitButton from "../../../components/Button/SubmitButton";
import CloseButton from "../../../components/Button/CloseButton";

interface AddUserFormModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const AddUserFormModal: FC<AddUserFormModalProps> = ({ isOpen, onClose }) => {
  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} showCloseButton>
        <form>
          <h1 className="text-2xl border-b border-gray-100 p-4 font-semibold mb-4">
            Add User Form
          </h1>
          <div className="grid grid-cols-2 gap-4 border-b border-gray-100 mb-4">
            <div className="col-span-2 md:col-span-1">
              <div className="mb-4">
                <FloatingLabelInput
                  type="text"
                  label="First Name"
                  name="firstName"
                  required
                  autofocus
                />
              </div>

              <div className="mb-4">
                <FloatingLabelInput
                  type="text"
                  label="Middle Name"
                  name="middleName"
                />
              </div>

              <div className="mb-4">
                <FloatingLabelInput
                  type="text"
                  label="Last Name"
                  name="lastName"
                  required
                />
              </div>

              <div className="mb-4">
                <FloatingLabelInput
                  type="text"
                  label="Suffix Name"
                  name="suffixName"
                />
              </div>

              <div className="mb-4">
                <FloatingLabelSelect label="Role" name="role">
                  Role
                </FloatingLabelSelect>
              </div>

              <div className="mb-4">
                <FloatingLabelSelect label="Office" name="office">
                  Office
                </FloatingLabelSelect>
              </div>
            </div>

            <div className="col-span-2 md:col-span-1">
              <div className="mb-4">
                <FloatingLabelInput
                  label="Email"
                  type="text"
                  name="email"
                  required
                />
              </div>

              <div className="mb-4">
                <FloatingLabelInput
                  label="Username"
                  type="text"
                  name="username"
                  required
                />
              </div>

              <div className="mb-4">
                <FloatingLabelInput
                  label="Password"
                  type="password"
                  name="password"
                  required
                />
              </div>

              <div className="mb-4">
                <FloatingLabelInput
                  label="Confirm Password"
                  type="password"
                  name="confirmPassword"
                  required
                />
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <CloseButton label="Close" onClose={onClose} />
            <SubmitButton label="Save User" />
          </div>
        </form>
      </Modal>
    </>
  );
};

export default AddUserFormModal;
