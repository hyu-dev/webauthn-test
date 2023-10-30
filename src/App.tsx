import { client, server } from "@passwordless-id/webauthn";
import { Fragment, useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { v4 } from "uuid";

type TFormValue = {
  userName: string | null;
};

const App = () => {
  const challenge = useMemo(() => v4(), []);
  const origin = useMemo(() => "http://localhost:3000", []);

  const [step, setStep] = useState("register");
  const [isRegister, setRegister] = useState(false);
  const [isAuthentication, setAuthentication] = useState(false);
  const [isUse, setUse] = useState(true);
  const [counter, setCounter] = useState(-1);

  const { register, handleSubmit, getValues, setValue } = useForm<TFormValue>();

  const getRegister = () => {
    const item = localStorage.getItem("register");
    return item ? JSON.parse(item) : null;
  };

  const registration = async (userName: string) => {
    return await client.register(userName, challenge, {
      authenticatorType: "auto",
      userVerification: "required",
      timeout: 60000,
      attestation: false,
      userHandle: "recommended to set it to a random 64 bytes value",
      debug: false,
    });
  };

  const authentication = async (userName: string) => {
    const data = getRegister();

    if (data) {
      const credentialId = data?.id;
      return await client.authenticate([credentialId], challenge, {
        authenticatorType: "auto",
        userVerification: "required",
        timeout: 60000,
      });
    }

    return null;
  };

  const onSubmit = async () => {
    const { userName } = getValues();

    if (!userName) {
      return alert("유저 이름을 입력하세요");
    }

    if (step === "register") {
      const result = await registration(userName);
      if (result) {
        const expected = { challenge, origin };
        const registrationParsed = await server.verifyRegistration(result, expected);
        const credential = registrationParsed.credential;
        localStorage.setItem("register", JSON.stringify(credential));
        setRegister(true);
        setStep("authentication");
        setValue("userName", null);
        alert("등록되었습니다.");
      }
    } else {
      const result = await authentication(userName);
      if (result) {
        const data = getRegister();
        const expected = {
          challenge,
          origin,
          userVerified: true,
          counter,
        };
        const authenticationParsed = await server.verifyAuthentication(result, data, expected);
        if (authenticationParsed) {
          setAuthentication(true);
          setCounter((prev) => prev + 1);
        }
      }
    }
  };

  useEffect(() => {
    if (!client.isAvailable()) {
      alert("해당 브라우저는 인증이 불가능합니다.\n다른 브라우저(예: Chrome)를 이용해주세요.");
      setUse(false);
    }
  }, []);

  return (
    <Fragment>
      {isUse ? (
        <form onSubmit={handleSubmit(onSubmit)}>
          <input {...register("userName")} />
          {step === "register" ? <button>등록하기</button> : <button>인증하기</button>}
          <div>
            {isRegister && <p>등록완료</p>}
            {isAuthentication && <p>인증완료</p>}
          </div>
        </form>
      ) : (
        <h1>다른 브라우저를 이용해주세요</h1>
      )}
    </Fragment>
  );
};

export default App;
