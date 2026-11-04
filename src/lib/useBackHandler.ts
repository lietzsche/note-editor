import { useEffect, useRef } from "react";
import { backHandlerStack, type BackHandlerStack } from "./backNavigation";

/**
 * active인 동안 휴대폰 뒤로가기 처리기를 등록한다.
 * 실제 popstate 연결은 모바일에서 설치되는 가드가 맡으므로, PC에서는 등록만 되고 실행되지 않는다.
 * onBack이 바뀌어도 다시 등록하지 않아 처리 순서(나중에 연 것부터)가 유지된다.
 */
export function useBackHandler(
  active: boolean,
  onBack: () => void,
  stack: BackHandlerStack = backHandlerStack
) {
  const onBackRef = useRef(onBack);
  onBackRef.current = onBack;

  useEffect(() => {
    if (!active) return undefined;
    return stack.register(() => onBackRef.current());
  }, [active, stack]);
}
