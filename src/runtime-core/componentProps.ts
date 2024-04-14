import { ComponentInstance } from "./component";
import { VNode } from "./vnode";

export function initProps(
    instance: ComponentInstance,
    rawProps: VNode["props"],
) {
    instance.props = rawProps || {};
}
