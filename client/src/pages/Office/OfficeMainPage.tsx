import AddOfficeForm from "./components/AddOfficeForm";
import OfficeList from "./components/OfficeList";

const OfficeMainPage = () => {
  return (
    <>
      <div className="grid gap-4">
        <div className="col-span-2 md:col-span-1">
          <AddOfficeForm />
        </div>
        <div className="col-span-2 md:col-span-1">
          <OfficeList />
        </div>
      </div>
    </>
  );
};

export default OfficeMainPage;
