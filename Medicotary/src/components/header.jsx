import "../index.css";
import React from "react";
import logo from "../assets/fulllogo.png";
import logoSmall from "../assets/logosmall.png";
import bellicon from "../assets/bell.svg";
import { Link } from "react-router-dom";
import BackButton from "./backbutton";

const Header = (props) => {
  const user = {
    companyName: "Demo Pharmacy",
    picture: null
  };

  return (
    <div className="h-1/10 fixed flex px-3 w-full border bg-white z-50">
      <button
        type="button"
        className="fixed z-50 bottom-4 right-4 w-16 h-16 rounded-full bg-gray-900 text-white block lg:hidden"
      >
        menu
      </button>
      {props.back ? (
        <div className="flex flex-wrap">
          <BackButton />
        </div>
      ) : (
        ""
      )}
      <Link to="/dash">
        <img
          src={logo}
          alt=""
          className="mr-auto object-scale-down h-12 hidden lg:block"
        />
        <img
          src={logoSmall}
          alt=""
          className="mr-auto object-scale-down h-12 lg:hidden"
        />
      </Link>
      <div className="flex ml-auto items-center">
        <h2 className="text-xl font-medium antialiased">
          {user.companyName}
        </h2>
        {/* bell icon */}
        <Link to="/notifications">
          {" "}
          <img src={bellicon} alt="" className="h-6 px-4" />{" "}
        </Link>
        {/* avatar */}
        <Link to="/profile">
          <img
            src={
              user.picture
                ? user.picture
                : "https://github.com/medicotary/Medicotary/blob/main/src/assets/profile/toy%20faces-male-01.png?raw=true"
            }
            alt="profile"
            className="object-scale-down h-10 rounded-full "
            loading="lazy"
          />
        </Link>
      </div>
    </div>
  );
};

export default Header;
