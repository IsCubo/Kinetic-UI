# Jetpack Compose

> Keywords: jetpack compose, android, kotlin, animateFloatAsState, animate*AsState, AnimatedVisibility, AnimatedContent, updateTransition, rememberInfiniteTransition, Animatable, spring, SharedTransitionLayout, sharedElement, MotionDurationScale, animator duration scale, remove animations, CompositionLocal, MaterialTheme, graphicsLayer, RuntimeShader, AGSL, low RAM, battery saver, animaciones android
> Summary: How to implement kinetic-ui motion in Jetpack Compose: tiers and tokens in a CompositionLocal, which animation API to use per tier, how Compose follows the system animation scale, and low-end fallbacks.

Build every effect from its framework-agnostic file first (`references/effects/`), then translate it with the tables below.

## Map the shared concepts

| Shared concept | Compose primitive |
| --- | --- |
| T0 Reduced | `KuiMotion.Reduced`: no travel, scale, or parallax; fades ≤200ms |
| T1 Essential | `animate*AsState`, `AnimatedVisibility` with fade, crossfades; no infinite transitions, no shaders |
| T2 Enhanced | `updateTransition`, `AnimatedContent` with motion, `SharedTransitionLayout`, `Animatable` springs and flings, Rive, Lottie, `Canvas` |
| T3 Immersive | AGSL `RuntimeShader` (API 33+), particles, 3D scenes |
| `--kui-duration-{xs..xl}`, `--kui-stagger` | `Int` milliseconds on `KuiMotion`, used in `tween(durationMillis = …)` |
| `--kui-ease-standard / enter / exit` | `CubicBezierEasing(0.2f, 0f, 0f, 1f)` / `(0.05f, 0.7f, 0.1f, 1f)` / `(0.3f, 0f, 0.8f, 0.15f)` |
| `--kui-ease-linear` | `LinearEasing` |
| `--kui-ease-spring` | `spring(dampingRatio = Spring.DampingRatioMediumBouncy, stiffness = Spring.StiffnessMediumLow)` (damping 0.5 ≈ the token's ~16% overshoot) |
| `--kui-distance-*` | `Dp` fields; convert with `LocalDensity` |
| `--kui-scale-*`, `--kui-parallax-strength` | `Float` fields |
| `--brand-primary`, `--brand-on-primary` | `ColorScheme.primary`, `ColorScheme.onPrimary` |
| `--brand-accent` | `ColorScheme.tertiary` |
| `--brand-surface`, `--brand-on-surface`, `--brand-muted` | `ColorScheme.surface`, `ColorScheme.onSurface`, `ColorScheme.onSurfaceVariant` |
| `--brand-font-display`, `--brand-font-body` | `Typography` display/headline styles and body/label styles (`FontFamily`) |
| `--brand-radius` | `Shapes(medium = RoundedCornerShape(r))` in `MaterialTheme` |

## Tokens in a CompositionLocal

```kotlin
@Immutable
data class KuiMotion(
    val tier: Int = 3, // 0..3, same meaning as data-motion-tier
    val durationXs: Int = 100, val durationSm: Int = 150, val durationMd: Int = 250,
    val durationLg: Int = 400, val durationXl: Int = 600, val stagger: Int = 40, // ms
    val distanceSm: Dp = 4.dp, val distanceMd: Dp = 12.dp, val distanceLg: Dp = 32.dp,
    val scalePress: Float = 0.97f, val scalePop: Float = 1.04f, val parallaxStrength: Float = 1f,
) {
    companion object {
        val Reduced = KuiMotion(
            tier = 0, durationLg = 200, durationXl = 200, stagger = 0,
            distanceSm = 0.dp, distanceMd = 0.dp, distanceLg = 0.dp,
            scalePress = 1f, scalePop = 1f, parallaxStrength = 0f,
        )
        fun forTier(tier: Int): KuiMotion = when (tier) {
            0 -> Reduced
            1 -> KuiMotion(tier = 1, stagger = 20, parallaxStrength = 0.4f)
            else -> KuiMotion(tier = tier.coerceAtMost(3))
        }
    }
}

object KuiEasing {
    val Standard = CubicBezierEasing(0.2f, 0f, 0f, 1f)
    val Enter = CubicBezierEasing(0.05f, 0.7f, 0.1f, 1f)
    val Exit = CubicBezierEasing(0.3f, 0f, 0.8f, 0.15f)
    fun <T> bouncy(): SpringSpec<T> =
        spring(dampingRatio = Spring.DampingRatioMediumBouncy, stiffness = Spring.StiffnessMediumLow)
}

val LocalKuiMotion = staticCompositionLocalOf { KuiMotion() }

@Composable
fun KuiMotionTheme(maxTier: Int = 3, userReduce: Boolean = false, content: @Composable () -> Unit) {
    val systemAnimations = rememberSystemAnimationsEnabled()
    val tier = if (userReduce || !systemAnimations) 0 else maxTier
    CompositionLocalProvider(LocalKuiMotion provides KuiMotion.forTier(tier), content = content)
}
```

Wrap it inside your `MaterialTheme` (brand colors, typography, shapes) and read tokens with `LocalKuiMotion.current`.

## Choose the API

| Need | API | Min tier |
| --- | --- | --- |
| One value follows state | `animateFloatAsState`, `animateColorAsState`, `animateDpAsState` | T1 |
| Show/hide | `AnimatedVisibility(enter, exit)` | T1 (fade) / T2 (slide, expand) |
| Swap content | `AnimatedContent(transitionSpec = …)`, `Crossfade` | T1 (fade) / T2 |
| Several values on one state change | `updateTransition` + `transition.animate*` | T2 |
| Gesture-driven, interruptible | `Animatable` with `animateTo`, `animateDecay` | T2 |
| Shared element between screens | `SharedTransitionLayout` + `Modifier.sharedElement` | T2 |
| Ambient loop | `rememberInfiniteTransition` | T2 |
| Shader | `RuntimeShader` in `Modifier.drawWithCache` / `graphicsLayer` (API 33+) | T3 |

Reveal with token distance (under T0 the distance is 0, so only the fade remains):

```kotlin
@Composable
fun Reveal(visible: Boolean, content: @Composable () -> Unit) {
    val motion = LocalKuiMotion.current
    val distancePx = with(LocalDensity.current) { motion.distanceMd.roundToPx() }
    AnimatedVisibility(
        visible = visible,
        enter = fadeIn(tween(motion.durationMd, easing = KuiEasing.Enter)) +
            slideInVertically(tween(motion.durationMd, easing = KuiEasing.Enter)) { distancePx },
        exit = fadeOut(tween(motion.durationSm, easing = KuiEasing.Exit)),
    ) { content() }
}
```

Shared elements: `SharedTransitionLayout`, `Modifier.sharedElement`, and `rememberSharedContentState` are stable in current Compose Animation. If the compiler asks for `@OptIn(ExperimentalSharedTransitionApi::class)`, the project is on an older release (see `references/libraries.md`).

```kotlin
SharedTransitionLayout {
    AnimatedContent(
        targetState = expanded,
        transitionSpec = { fadeIn(tween(motion.durationSm)) togetherWith fadeOut(tween(motion.durationSm)) },
        label = "photo",
    ) { isExpanded ->
        val shared = if (motion.tier >= 2) {
            Modifier.sharedElement(
                rememberSharedContentState(key = "photo"),
                animatedVisibilityScope = this@AnimatedContent,
            )
        } else Modifier
        if (isExpanded) PhotoDetail(shared, onClose = { expanded = false })
        else PhotoThumb(shared, onOpen = { expanded = true })
    }
}
```

The default `AnimatedContent` transition includes a scale-in, so always pass a `transitionSpec` that matches the tier.

## Reduced motion

How Compose follows the system:
- Compose reads the system **Animator duration scale** through `MotionDurationScale` in the frame clock's coroutine context. The scale multiplies durations; at `0` an animation ends on the next frame.
- The Accessibility setting **Remove animations** (Settings → Accessibility → Color and motion) and the Developer option "Animator duration scale: off" both result in a zero scale, so duration-based Compose animations snap to their end values.
- That snap is not a T0 design: a zero scale also removes the ≤200ms fades that T0 keeps, and custom loops (`withFrameNanos`, game loops, Lottie/Rive players) may keep running. Detect the setting and switch tokens explicitly:

```kotlin
@Composable
fun rememberSystemAnimationsEnabled(): Boolean {
    val resolver = LocalContext.current.contentResolver
    fun read() = Settings.Global.getFloat(resolver, Settings.Global.ANIMATOR_DURATION_SCALE, 1f) > 0f
    var enabled by remember { mutableStateOf(read()) }
    DisposableEffect(resolver) {
        val observer = object : ContentObserver(Handler(Looper.getMainLooper())) {
            override fun onChange(selfChange: Boolean) { enabled = read() }
        }
        resolver.registerContentObserver(
            Settings.Global.getUriFor(Settings.Global.ANIMATOR_DURATION_SCALE), false, observer,
        )
        onDispose { resolver.unregisterContentObserver(observer) }
    }
    return enabled
}
```

At T0: use `KuiMotion.Reduced`, fade-only `transitionSpec`s, no `sharedElement`, no `rememberInfiniteTransition`, Rive/Lottie frozen on a final frame, no shaders. `ValueAnimator.areAnimatorsEnabled()` (API 26+) is also `false` when Battery Saver disables animations; treat that as T0 too. Offer the in-app "Reduce motion" toggle (`userReduce`).

## Low-end fallback

| Tier | Compose behavior |
| --- | --- |
| T3 → T2 | `RuntimeShader` replaced by a `Brush` gradient or a Lottie loop; particles cut |
| T2 → T1 | `animate*AsState` and fades only; no shared elements, no infinite transitions; Rive/Lottie static |
| T1 → T0 | `KuiMotion.Reduced` |

Detect and cap (pass the result as `maxTier`):

```kotlin
fun deviceTierCap(context: Context): Int {
    val am = context.getSystemService(ActivityManager::class.java)
    val pm = context.getSystemService(PowerManager::class.java)
    return when {
        am.isLowRamDevice || pm.isPowerSaveMode -> 1
        Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q &&
            pm.currentThermalStatus >= PowerManager.THERMAL_STATUS_SEVERE -> 1
        Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU -> 2 // no RuntimeShader
        else -> 3
    }
}
```

- Measure jank on the main animation with JankStats or Macrobenchmark; under ~45 fps, lower the tier once for the session.
- `Build.VERSION.MEDIA_PERFORMANCE_CLASS` (API 31+) is a useful extra signal; 0 means undeclared, not slow.

Performance rules:
- Read animated values in the draw or layout phase, not in composition: `Modifier.graphicsLayer { translationY = offset * size.height }`, `Modifier.offset { IntOffset(0, y) }`. This skips recomposition every frame.
- Animate `alpha`, `translation*`, `scale*`, and `rotation*` in `graphicsLayer`; animating size or padding re-measures every frame.
- `Modifier.blur` only works on API 31+; provide a solid or gradient fallback below.
- Ship Baseline Profiles so first-run animations are not janky from JIT compilation.
- Stop infinite transitions when the screen is not visible; they live as long as their composable.

## Pitfalls

- Relying on the system scale alone: it removes all animations including safe fades, and does not stop custom loops.
- Forgetting `label` on `animate*AsState` and transitions makes Animation Preview and inspection hard to use.
- Using `rememberInfiniteTransition` for one-shot feedback keeps the frame clock busy forever.
- Reading `animateFloatAsState(...).value` in composition for per-frame layout changes causes recomposition storms.
