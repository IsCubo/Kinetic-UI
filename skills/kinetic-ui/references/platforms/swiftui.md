# SwiftUI

> Keywords: swiftui, ios, ipados, macos, visionos, withAnimation, spring, bounce, matchedGeometryEffect, PhaseAnimator, KeyframeAnimator, scrollTransition, visualEffect, TimelineView, accessibilityReduceMotion, accessibilityReduceTransparency, ProMotion, 120 Hz, Low Power Mode, thermal state, EnvironmentValues, Metal shader, animaciones swiftui
> Summary: How to implement kinetic-ui motion in SwiftUI: tiers and tokens through the environment, which animation API to use per tier and OS version, reduced motion and transparency, ProMotion, and low-end fallbacks.

Build every effect from its framework-agnostic file first (`references/effects/`), then translate it with the tables below.

## Map the shared concepts

| Shared concept | SwiftUI primitive |
| --- | --- |
| T0 Reduced | `KuiMotion.reduced`: no travel, scale, or parallax; fades ≤200ms |
| T1 Essential | Implicit animations (`.animation(_:value:)`, `withAnimation`) with standard curves; system transitions; no `TimelineView` loops, no shaders |
| T2 Enhanced | Springs and choreography, `PhaseAnimator`, `KeyframeAnimator`, `matchedGeometryEffect`, `scrollTransition`, Rive, Lottie, `Canvas` |
| T3 Immersive | Metal shaders (`colorEffect`, `distortionEffect`, `layerEffect`), particles, RealityKit/SceneKit scenes |
| `--kui-duration-{xs..xl}`, `--kui-stagger` | `Double` seconds on `KuiMotion` (250ms → `0.25`) |
| `--kui-ease-standard / enter / exit` | `.timingCurve(0.2, 0, 0, 1, duration:)` / `(0.05, 0.7, 0.1, 1)` / `(0.3, 0, 0.8, 0.15)` |
| `--kui-ease-linear` | `.linear(duration:)` |
| `--kui-ease-spring` | `.spring(duration: 0.4, bounce: 0.5)` (iOS 17+; damping ≈ 0.5, close to the token's ~16% overshoot); `.spring(response: 0.4, dampingFraction: 0.5)` before iOS 17 |
| `--kui-distance-*`, `--kui-scale-*`, `--kui-parallax-strength` | `CGFloat` fields (points, factors) |
| `--brand-primary`, `--brand-on-primary`, `--brand-accent`, `--brand-surface`, `--brand-on-surface`, `--brand-muted` | Named colors in the asset catalog (light and dark variants), exposed as `Color` statics; set `.tint` to the primary |
| `--brand-font-display`, `--brand-font-body` | `Font.custom(name, size:, relativeTo:)` so Dynamic Type still scales |
| `--brand-radius` | `RoundedRectangle(cornerRadius:)` / `.clipShape` value |

## Tokens in the environment

```swift
import SwiftUI

struct KuiMotion {
    var tier = 3 // 0...3, same meaning as data-motion-tier
    var durationXs = 0.10, durationSm = 0.15, durationMd = 0.25, durationLg = 0.40, durationXl = 0.60
    var stagger = 0.04
    var distanceSm: CGFloat = 4, distanceMd: CGFloat = 12, distanceLg: CGFloat = 32
    var scalePress: CGFloat = 0.97, scalePop: CGFloat = 1.04
    var parallaxStrength: CGFloat = 1

    static let reduced = KuiMotion(tier: 0, durationLg: 0.2, durationXl: 0.2, stagger: 0,
                                   distanceSm: 0, distanceMd: 0, distanceLg: 0,
                                   scalePress: 1, scalePop: 1, parallaxStrength: 0)

    static func forTier(_ tier: Int) -> KuiMotion {
        switch tier {
        case 0: return .reduced
        case 1: return KuiMotion(tier: 1, stagger: 0.02, parallaxStrength: 0.4)
        default: return KuiMotion(tier: min(tier, 3))
        }
    }

    func standard(_ duration: Double) -> Animation { .timingCurve(0.2, 0, 0, 1, duration: duration) }
    func enter(_ duration: Double) -> Animation { .timingCurve(0.05, 0.7, 0.1, 1, duration: duration) }
    func exit(_ duration: Double) -> Animation { .timingCurve(0.3, 0, 0.8, 0.15, duration: duration) }
}

private struct KuiMotionKey: EnvironmentKey {
    static let defaultValue = KuiMotion()
}

extension EnvironmentValues {
    var kuiMotion: KuiMotion {
        get { self[KuiMotionKey.self] }
        set { self[KuiMotionKey.self] = newValue }
    }
}

struct KuiMotionRoot: ViewModifier {
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @AppStorage("kui.reduceMotion") private var userReduce = false // in-app toggle
    var maxTier = 3 // design cap and device cap

    func body(content: Content) -> some View {
        content.environment(\.kuiMotion, .forTier(reduceMotion || userReduce ? 0 : maxTier))
    }
}
// WindowGroup { ContentView().modifier(KuiMotionRoot()) }
```

Read it with `@Environment(\.kuiMotion) private var motion`.

## Choose the API

| Need | API | Availability | Min tier |
| --- | --- | --- | --- |
| Value change (color, size, opacity) | `.animation(motion.standard(motion.durationSm), value: x)` | iOS 13+ | T1 |
| Insert/remove | `.transition(.opacity)`; add `.move`/`.scale` only at T2+ | iOS 13+ | T1 |
| Press feedback | `ButtonStyle` reading `configuration.isPressed` | iOS 13+ | T1 |
| Shared element in one hierarchy | `matchedGeometryEffect(id:in:)` with `@Namespace` | iOS 14+ | T2 |
| Multi-step sequence | `PhaseAnimator` / `.phaseAnimator(_:trigger:content:animation:)` | iOS 17+ | T2 |
| Per-property timeline | `KeyframeAnimator` / `.keyframeAnimator(initialValue:trigger:content:keyframes:)` | iOS 17+ | T2 |
| Scroll-linked appearance | `.scrollTransition { content, phase in … }` | iOS 17+ | T1 (opacity) / T2 (scale) |
| Parallax from geometry | `.visualEffect { content, proxy in … }` | iOS 17+ | T2 |
| Continuous drawing | `TimelineView(.animation(minimumInterval:paused:))` + `Canvas` | iOS 15+ | T2 |
| Shaders | `.colorEffect`, `.distortionEffect`, `.layerEffect` with `ShaderLibrary` | iOS 17+ | T3 |

Press feedback with tokens (T0 keeps only the opacity change):

```swift
struct KuiPressStyle: ButtonStyle {
    @Environment(\.kuiMotion) private var motion

    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .scaleEffect(configuration.isPressed ? motion.scalePress : 1)
            .opacity(configuration.isPressed ? 0.85 : 1)
            .animation(motion.standard(motion.durationXs), value: configuration.isPressed)
    }
}
```

Scroll reveal and parallax (iOS 17+):

```swift
struct Feed: View {
    @Environment(\.kuiMotion) private var motion
    let items: [Item]

    var body: some View {
        let scaled = motion.tier >= 2
        let strength = motion.parallaxStrength
        ScrollView {
            Image("hero")
                .resizable().scaledToFill().frame(height: 280).clipped()
                .visualEffect { content, proxy in
                    content.offset(y: -proxy.frame(in: .scrollView).minY * 0.2 * strength)
                }
            LazyVStack(spacing: 16) {
                ForEach(items) { item in
                    ItemRow(item: item)
                        .scrollTransition { content, phase in
                            content
                                .opacity(phase.isIdentity ? 1 : 0.4)
                                .scaleEffect(scaled && !phase.isIdentity ? 0.94 : 1)
                        }
                }
            }
        }
    }
}
```

Choreography: use `.phaseAnimator([false, true], trigger: count) { content, up in content.scaleEffect(up ? motion.scalePop : 1) }` for a success pop; under T0 `scalePop` is 1, so nothing moves. Give `KeyframeAnimator` tracks durations from the tokens, and cap the total at `durationXl`.

Shared elements: `matchedGeometryEffect` needs both views in the same hierarchy and a single `isSource`. For navigation pushes on iOS 18+, use `.navigationTransition(.zoom(sourceID:in:))` with `.matchedTransitionSource(id:in:)`. At T0, use `.transition(.opacity)` and skip both.

## Reduced motion

| Setting | Environment value | Behavior |
| --- | --- | --- |
| Reduce Motion | `\.accessibilityReduceMotion` | Force T0 through `KuiMotionRoot` |
| Prefer Cross-Fade Transitions | `\.accessibilityPrefersCrossFadeTransitions` | Replace slides and pushes with `.opacity` |
| Reduce Transparency | `\.accessibilityReduceTransparency` | Replace `.ultraThinMaterial` and glass with the solid `--brand-surface` color |
| Animated images autoplay off | `\.accessibilityPlayAnimatedImages` | Do not autoplay Lottie, Rive, or GIF-like content |

At T0:
- Token distances and scales are neutral, so token-based modifiers only fade.
- Stop `TimelineView` loops with `paused: true`, skip `PhaseAnimator` loops without a trigger, freeze Rive/Lottie on a final frame, and drop shaders.
- Disable an animation in one spot with `.transaction { $0.animation = nil }`, or wrap the state change in `withTransaction(Transaction(animation: nil)) { … }`.
- System controls (sheets, navigation) adapt by themselves; custom transitions do not.
- UIKit-hosted code reads `UIAccessibility.isReduceMotionEnabled` and observes `UIAccessibility.reduceMotionStatusDidChangeNotification`.

## Low-end fallback

| Tier | SwiftUI behavior |
| --- | --- |
| T3 → T2 | Shader or 3D scene replaced by a `Canvas` drawing, a Lottie loop, or a static image; particles cut |
| T2 → T1 | Implicit curves only; no `PhaseAnimator` loops, `KeyframeAnimator` reduced to one `.standard` change; no `TimelineView` |
| T1 → T0 | `KuiMotion.reduced` |

Detect and cap (pass the result as `maxTier`):
- `ProcessInfo.processInfo.isLowPowerModeEnabled` → cap T1; observe `.NSProcessInfoPowerStateDidChange`.
- `ProcessInfo.processInfo.thermalState` `.serious` or `.critical` → cap T1; observe `ProcessInfo.thermalStateDidChangeNotification`.
- `ProcessInfo.processInfo.physicalMemory` very low (≤2 GB) → cap T1. Treat it as a weak signal.
- Measure the main animation with a `CADisplayLink`; under ~45 fps, lower the tier once for the session.

ProMotion (120 Hz):
- The system paces SwiftUI, UIKit, and Core Animation animations automatically; the frame budget drops to 8.3 ms.
- Custom timing (`CADisplayLink`, Metal) above 60 Hz on iPhone needs `CADisableMinimumFrameDurationOnPhone` set to `true` in Info.plist, plus a `preferredFrameRateRange`.
- Run ambient loops at 30–60 Hz: `TimelineView(.animation(minimumInterval: 1.0 / 30, paused: motion.tier < 2))`.

Performance rules:
- Animate `opacity`, `scaleEffect`, `offset`, and `rotationEffect`; animating frames or layout re-runs layout every frame.
- Flatten complex animated stacks with `.drawingGroup()`; keep blur and materials small.
- Profile with Instruments (SwiftUI and Animation Hitches templates) on the oldest supported device.

## Pitfalls

- `matchedGeometryEffect` with two sources, or across separate hierarchies, produces jumps instead of a morph.
- `.animation(_:)` without `value:` is deprecated and animates unrelated changes.
- iOS 17-only APIs (`PhaseAnimator`, `KeyframeAnimator`, `scrollTransition`, `visualEffect`, shaders) need `if #available(iOS 17, *)` and a T1 path for older systems.
- Reduce Motion does not mean "no feedback": keep opacity and color changes so actions stay visible.
