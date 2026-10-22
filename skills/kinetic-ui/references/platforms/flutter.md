# Flutter

> Keywords: flutter, dart, implicit animations, AnimatedContainer, AnimatedOpacity, TweenAnimationBuilder, AnimationController, AnimatedSwitcher, Hero, page transitions, PageTransitionsTheme, spring, physics, SpringSimulation, Rive, Lottie, flutter_animate, fragment shader, FragmentProgram, Impeller, RepaintBoundary, ThemeExtension, disableAnimations, reduceMotion, animaciones flutter
> Summary: How to implement kinetic-ui motion in Flutter: tiers and tokens as a ThemeExtension, which animation API to use per tier, reduced motion on iOS and Android, shaders, and low-end performance.

Build every effect from its framework-agnostic file first (`references/effects/`), then translate it with the tables below.

## Map the shared concepts

| Shared concept | Flutter primitive |
| --- | --- |
| T0 Reduced | `KuiMotion.reduced`: no travel, scale, or parallax; fades ≤200ms |
| T1 Essential | Implicit animations and built-in route transitions only; no repeating controllers, no Rive/Lottie playback, no shaders |
| T2 Enhanced | `AnimationController` choreography, physics, `Hero`, Rive, Lottie, `CustomPainter` |
| T3 Immersive | `FragmentProgram` shaders, particles, continuous GPU scenes |
| `--kui-duration-{xs..xl}`, `--kui-stagger` | `Duration` fields on `KuiMotion` |
| `--kui-ease-standard / enter / exit / linear` | `Cubic(0.2, 0, 0, 1)` / `Cubic(0.05, 0.7, 0.1, 1)` / `Cubic(0.3, 0, 0.8, 0.15)` / `Curves.linear` |
| `--kui-ease-spring` | `SpringDescription.withDampingRatio(mass: 1, stiffness: 300, ratio: 0.5)` for physics; `Curves.easeOutBack` as a curve approximation |
| `--kui-distance-*`, `--kui-scale-*`, `--kui-parallax-strength` | `double` fields (logical pixels, factors) |
| `--brand-primary`, `--brand-on-primary` | `ColorScheme.primary`, `ColorScheme.onPrimary` |
| `--brand-accent` | `ColorScheme.tertiary` |
| `--brand-surface`, `--brand-on-surface`, `--brand-muted` | `ColorScheme.surface`, `ColorScheme.onSurface`, `ColorScheme.onSurfaceVariant` |
| `--brand-font-display`, `--brand-font-body` | `TextTheme` display/headline styles and body/label styles (`fontFamily`) |
| `--brand-radius` | `RoundedRectangleBorder(borderRadius: BorderRadius.circular(r))` in component themes |

## Tokens as a ThemeExtension

```dart
import 'package:flutter/material.dart';

@immutable
class KuiMotion extends ThemeExtension<KuiMotion> {
  const KuiMotion({
    this.tier = 3, // 0..3, same meaning as data-motion-tier
    this.durationXs = const Duration(milliseconds: 100),
    this.durationSm = const Duration(milliseconds: 150),
    this.durationMd = const Duration(milliseconds: 250),
    this.durationLg = const Duration(milliseconds: 400),
    this.durationXl = const Duration(milliseconds: 600),
    this.stagger = const Duration(milliseconds: 40),
    this.distanceSm = 4, this.distanceMd = 12, this.distanceLg = 32,
    this.scalePress = 0.97, this.scalePop = 1.04, this.parallaxStrength = 1,
  });

  static const reduced = KuiMotion(
    tier: 0, durationLg: Duration(milliseconds: 200), durationXl: Duration(milliseconds: 200),
    stagger: Duration.zero, distanceSm: 0, distanceMd: 0, distanceLg: 0,
    scalePress: 1, scalePop: 1, parallaxStrength: 0,
  );

  factory KuiMotion.forTier(int tier) => switch (tier) {
        0 => reduced,
        1 => const KuiMotion(tier: 1, stagger: Duration(milliseconds: 20), parallaxStrength: 0.4),
        _ => KuiMotion(tier: tier),
      };

  static const easeStandard = Cubic(0.2, 0, 0, 1);
  static const easeEnter = Cubic(0.05, 0.7, 0.1, 1);
  static const easeExit = Cubic(0.3, 0, 0.8, 0.15);

  final int tier;
  final Duration durationXs, durationSm, durationMd, durationLg, durationXl, stagger;
  final double distanceSm, distanceMd, distanceLg, scalePress, scalePop, parallaxStrength;

  @override
  KuiMotion copyWith() => this; // replace the whole set with KuiMotion.forTier

  @override
  KuiMotion lerp(KuiMotion? other, double t) => t < 0.5 || other == null ? this : other;
}
```

Read it with `Theme.of(context).extension<KuiMotion>()!`. Tokens switch between tiers; they never tween.

## Choose the API

| Need | API | Min tier |
| --- | --- | --- |
| Size, color, padding, alignment change | `AnimatedContainer`, `AnimatedOpacity`, `AnimatedScale`, `AnimatedAlign`, `TweenAnimationBuilder` | T1 |
| Swap one child for another | `AnimatedSwitcher` (give each child a distinct `key`) | T1 |
| Route transitions | `PageTransitionsTheme` in `ThemeData`, or `PageRouteBuilder` | T1 |
| Shared element between routes | `Hero` (disable a subtree with `HeroMode(enabled: false)`) | T2 |
| Sequenced, staggered choreography | `AnimationController` + `Interval` / `TweenSequence` | T2 |
| Drag release, fling, bounce | `SpringSimulation` + `controller.animateWith` | T2 |
| Designer-made vector animation | Rive (state machines), Lottie | T2 |
| Custom drawing, shaders, particles | `CustomPainter`, `FragmentProgram` | T2 / T3 |

Entry with token distance (mirrors the CSS enter pattern; under T0 the distance is 0, so only opacity remains):

```dart
final motion = Theme.of(context).extension<KuiMotion>()!;
return TweenAnimationBuilder<double>(
  tween: Tween(begin: 1, end: 0),
  duration: motion.durationMd,
  curve: KuiMotion.easeEnter,
  builder: (context, t, child) => Opacity(
    opacity: 1 - t,
    child: Transform.translate(offset: Offset(0, t * motion.distanceMd), child: child),
  ),
  child: const FeatureCard(),
);
```

Explicit controllers: create in `initState` with `SingleTickerProviderStateMixin`, dispose in `dispose()`, and decide in the build path whether to run:

```dart
@override
void didChangeDependencies() {
  super.didChangeDependencies();
  final motion = Theme.of(context).extension<KuiMotion>()!;
  if (motion.tier >= 2) {
    _controller.repeat(period: const Duration(seconds: 6)); // ambient loop: T2+ only
  } else {
    _controller.stop();
    _controller.value = 0.25; // a meaningful static frame
  }
}
```

Springs: `_controller.animateWith(SpringSimulation(spring, _controller.value, 1, velocity))` with the `--kui-ease-spring` description above; at T0 call `_controller.value = 1` instead.

## Rive, Lottie, flutter_animate

- **Rive**: drive state machines through their inputs; pause the controller or show a static artboard at T0/T1. The runtime API changed across major versions (current releases initialize the native runtime and load files through a loader widget); match the version pinned in `references/libraries.md`.
- **Lottie**: `Lottie.asset(path, controller: c, onLoaded: (comp) => c.duration = comp.duration)`. At T0/T1 set `c.value` to a final, readable frame and never `repeat()`. Cap ambient loops with `frameRate: FrameRate(30)`.
- **flutter_animate**: convenient chained effects, but it has had no recent release (maintenance risk in `references/libraries.md`). Prefer built-in APIs for new work.

## Fragment shaders (T3)

```yaml
# pubspec.yaml
flutter:
  shaders:
    - shaders/glow.frag
```

```glsl
#version 460 core
#include <flutter/runtime_effect.glsl>

uniform vec2 uSize;
uniform float uTime;
out vec4 fragColor;

void main() {
  vec2 uv = FlutterFragCoord().xy / uSize;
  float pulse = 0.5 + 0.5 * sin(uTime + uv.x * 6.2831);
  fragColor = vec4(uv * pulse, 0.6, 1.0);
}
```

```dart
import 'dart:ui' as ui;
import 'package:flutter/widgets.dart';

// final program = await ui.FragmentProgram.fromAsset('shaders/glow.frag');
class GlowPainter extends CustomPainter {
  GlowPainter(this.shader, this.time) : super(repaint: time);
  final ui.FragmentShader shader;
  final Animation<double> time;

  @override
  void paint(Canvas canvas, Size size) {
    shader
      ..setFloat(0, size.width) // uSize.x: indices follow declaration order
      ..setFloat(1, size.height)
      ..setFloat(2, time.value * 6.2831); // uTime
    canvas.drawRect(Offset.zero & size, Paint()..shader = shader);
  }

  @override
  bool shouldRepaint(GlowPainter oldDelegate) => oldDelegate.shader != shader;
}
```

Wrap the `CustomPaint` in a `RepaintBoundary`. Below T3, paint a static `LinearGradient` in the brand colors instead.

## Reduced motion

The platforms expose the setting differently. Read both flags:

| Platform setting | Flutter flag | Notes |
| --- | --- | --- |
| Android "Remove animations" | `MediaQuery.disableAnimationsOf(context)` / `accessibilityFeatures.disableAnimations` | `AnimationController` with the default `AnimationBehavior.normal` shortens itself; repeating controllers default to `preserve` and keep running |
| iOS Reduce Motion | `PlatformDispatcher.accessibilityFeatures.reduceMotion` | Not mirrored in `MediaQuery`; does not set `disableAnimations` |

```dart
class KuiMotionScope extends StatefulWidget {
  const KuiMotionScope({super.key, required this.builder, this.maxTier = 3, this.userReduce = false});
  final Widget Function(BuildContext context, KuiMotion motion) builder;
  final int maxTier; // design cap and device cap (1..3)
  final bool userReduce; // in-app "Reduce motion" toggle
  @override
  State<KuiMotionScope> createState() => _KuiMotionScopeState();
}

class _KuiMotionScopeState extends State<KuiMotionScope> with WidgetsBindingObserver {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
  }

  @override
  void didChangeAccessibilityFeatures() => setState(() {});

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final a11y = WidgetsBinding.instance.platformDispatcher.accessibilityFeatures;
    final reduce = widget.userReduce || a11y.disableAnimations || a11y.reduceMotion;
    return widget.builder(context, KuiMotion.forTier(reduce ? 0 : widget.maxTier));
  }
}
// KuiMotionScope(builder: (context, motion) => MaterialApp(theme: ThemeData(extensions: [motion]), home: const Home()))
```

At T0: token distances and scales are neutral, so token-based widgets only fade. Stop every repeating controller, disable `Hero` with `HeroMode`, use a fade-only `PageTransitionsTheme`, freeze Rive/Lottie on a final frame, and skip shaders. On Flutter web, confirm the flag reaches `accessibilityFeatures` in your Flutter version; otherwise read `prefers-reduced-motion` through JS interop.

## Low-end fallback

| Tier | Flutter behavior |
| --- | --- |
| T3 → T2 | Shader replaced by a `CustomPainter` gradient or a Lottie loop; particle count cut |
| T2 → T1 | Implicit animations only; Rive/Lottie show a static frame; no ambient loops; `Hero` off |
| T1 → T0 | `KuiMotion.reduced`: fades ≤200ms, no travel |

Detect and cap (pass the result as `maxTier`):
- Android: `ActivityManager.isLowRamDevice()` or Battery Saver (`PowerManager.isPowerSaveMode`) → cap T1, through a platform channel or a device-info plugin.
- iOS: Low Power Mode (`ProcessInfo.isLowPowerModeEnabled`) or a `serious` thermal state → cap T1.
- Frame timing: `SchedulerBinding.instance.addTimingsCallback` reports `FrameTiming.totalSpan`. If most frames of the main animation exceed ~22 ms (under ~45 fps), lower the tier once for the session, then remove the callback.

Performance rules:
- Impeller is the default renderer on iOS and modern Android and precompiles its shaders, so first-run shader jank is gone. Still profile in `--profile` mode on a real low-end device.
- Isolate animated regions with `RepaintBoundary` (spinners, shader canvases, tickers inside lists).
- Avoid rebuild storms: use `AnimatedBuilder` / `*Transition` widgets with a `child` for the static subtree; never `setState` per frame on a large tree; keep static widgets `const`.
- Prefer `FadeTransition` / `AnimatedOpacity` over animating `Opacity` on big subtrees; keep `BackdropFilter`, `ShaderMask`, and `saveLayer`-heavy effects small.
- Tickers pause automatically in routes that are not visible; pause other offscreen loops with `TickerMode(enabled: false)`.

## Pitfalls

- Reading only `MediaQuery.disableAnimationsOf` ignores iOS Reduce Motion.
- `controller.repeat()` ignores Android "Remove animations" by design: gate loops yourself.
- Forgetting `dispose()` on controllers leaks tickers and throws after the widget unmounts.
- `AnimatedSwitcher` children without distinct keys do not animate.
- Shader uniforms are set by index in declaration order; a reordered uniform silently breaks the effect.
